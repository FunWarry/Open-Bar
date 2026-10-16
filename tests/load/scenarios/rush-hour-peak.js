import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { DEFAULT_BASE_URL, getAuthHeaders, authenticateUser } from '../helpers/auth.js';
import { buildConnectFrame, buildSubscribeFrame, parseStompFrames } from '../helpers/stomp-ws.js';

const orderCreationDuration = new Trend('order_creation_duration', true);
const cartFetchDuration = new Trend('cart_fetch_duration', true);
const wsConnectDuration = new Trend('rush_ws_connect_duration', true);
const successfulOrders = new Counter('rush_successful_orders');

export const options = {
  scenarios: {
    // 10 Waitstaff tablets actively placing and modifying orders across 40+ tables
    waitstaff_submitting_orders: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '15s', target: 10 }, // Ramp to 10 active servers
        { duration: '45s', target: 10 }, // Sustained rush hour order flow
        { duration: '10s', target: 0 },
      ],
      exec: 'waitstaffScenario',
    },
    // 20+ Patrons querying menus and collaborative carts
    patrons_browsing_carts: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '15s', target: 20 }, // Ramp to 20 patrons
        { duration: '45s', target: 20 }, // Sustained browsing & cart adds
        { duration: '10s', target: 0 },
      ],
      exec: 'patronScenario',
    },
    // 4 Bartender & Kitchen display workstations listening to WebSocket topics
    workstations_stomp_listening: {
      executor: 'constant-vus',
      vus: 4,
      duration: '70s',
      exec: 'workstationScenario',
    },
  },
  thresholds: {
    'order_creation_duration': ['p(95)<80'],
    'cart_fetch_duration': ['p(95)<80'],
    'rush_ws_connect_duration': ['p(95)<150'],
    'http_req_failed': ['rate<0.02'],
  },
};

/**
 * Waitstaff tablet persona:
 * Places orders across 40+ active tables with realistic think time.
 */
export function waitstaffScenario() {
  const baseUrl = DEFAULT_BASE_URL;
  const waiterUsername = `serveur${(__VU % 3) + 1}`;
  const headers = getAuthHeaders(waiterUsername, 'serveur123', baseUrl);

  // Target tables 1 to 40
  const tableId = ((__ITER * 10 + __VU) % 40) + 1;
  const clientRequestId = `rush-req-vu${__VU}-iter${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    tableId: tableId,
    clientRequestId: clientRequestId,
    notes: 'Rush hour table order',
    items: [
      {
        cocktailId: ((__ITER + __VU) % 12) + 1,
        quantite: 2,
        prixUnitaire: 8.50,
        notes: 'Sans paille',
        prioritaire: false,
      },
      {
        cocktailId: (((__ITER + __VU) * 2) % 12) + 1,
        quantite: 1,
        prixUnitaire: 9.00,
        notes: '',
        prioritaire: true,
      },
    ],
  });

  const startTime = Date.now();
  const res = http.post(`${baseUrl}/api/commandes`, payload, {
    headers: headers,
    tags: { name: 'Waitstaff_Create_Order' },
  });

  const ok = check(res, {
    'waitstaff order status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  if (ok) {
    orderCreationDuration.add(Date.now() - startTime);
    successfulOrders.add(1);
  }

  // Realistic waiter think time before serving the next table (1.5s - 3s)
  sleep(2);
}

/**
 * Patron persona:
 * Consults public table cart and updates drinks.
 */
export function patronScenario() {
  const baseUrl = DEFAULT_BASE_URL;
  const tableId = (__VU % 40) + 1;

  const startGet = Date.now();
  const cartRes = http.get(`${baseUrl}/api/public/tables/${tableId}/cart`, {
    tags: { name: 'Patron_Get_Cart' },
  });

  check(cartRes, {
    'patron cart status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  cartFetchDuration.add(Date.now() - startGet);

  sleep(1);

  // Patron adds a drink to shared cart
  const addPayload = JSON.stringify({
    guestSessionId: `patron-rush-vu${__VU}`,
    guestName: `Guest_${__VU}`,
    cocktailId: ((__VU + __ITER) % 10) + 1,
    quantite: 1,
    notes: 'Citron vert en plus',
  });

  http.post(`${baseUrl}/api/public/tables/${tableId}/cart/items`, addPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Patron_Add_Item' },
  });

  sleep(2.5);
}

/**
 * Bartender / Kitchen workstation persona:
 * Sustains STOMP WebSocket connection to /topic/commandes and /topic/barman/commandes.
 */
export function workstationScenario() {
  const baseUrl = DEFAULT_BASE_URL;
  const wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/ws';
  const token = authenticateUser('barman1', 'barman123', baseUrl);
  const startTime = Date.now();

  ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', function () {
      wsConnectDuration.add(Date.now() - startTime);
      socket.send(buildConnectFrame(token));
    });

    socket.on('message', function (data) {
      const frames = parseStompFrames(data);
      for (const frame of frames) {
        if (frame.command === 'CONNECTED') {
          socket.send(buildSubscribeFrame('/topic/commandes', `kds-sub-commandes-${__VU}`));
          socket.send(buildSubscribeFrame('/topic/barman/commandes', `kds-sub-barman-${__VU}`));
        }
      }
    });

    socket.setTimeout(function () {
      socket.close();
    }, 20000);
  });

  sleep(2);
}
