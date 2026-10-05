import http from 'k6/http';
import ws from 'k6/ws';
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { DEFAULT_BASE_URL, getAuthHeaders, authenticateUser } from '../helpers/auth.js';
import { buildConnectFrame, buildSubscribeFrame, parseStompFrames } from '../helpers/stomp-ws.js';

const apiP95Trend = new Trend('api_p95_response_time', true);
const wsP95Trend = new Trend('ws_p95_broadcast_time', true);
const totalOrdersCreated = new Counter('sim_orders_created');
const totalBillsSettled = new Counter('sim_bills_settled');

export const options = {
  scenarios: {
    waiters: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '60s', target: 10 },
        { duration: '15s', target: 0 },
      ],
      exec: 'waiterRun',
    },
    patrons: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '15s', target: 20 },
        { duration: '60s', target: 20 },
        { duration: '15s', target: 0 },
      ],
      exec: 'patronRun',
    },
    displays: {
      executor: 'constant-vus',
      vus: 4,
      duration: '90s',
      exec: 'displayRun',
    },
    cashiers: {
      executor: 'constant-vus',
      vus: 2,
      duration: '90s',
      exec: 'cashierRun',
    },
  },
  thresholds: {
    'api_p95_response_time': ['p(95)<80'],
    'ws_p95_broadcast_time': ['p(95)<150'],
    'http_req_failed': ['rate<0.02'],
  },
};

export function waiterRun() {
  const baseUrl = DEFAULT_BASE_URL;
  const username = `serveur${(__VU % 3) + 1}`;
  const headers = getAuthHeaders(username, 'serveur123', baseUrl);
  const tableId = ((__ITER * 5 + __VU) % 40) + 1;

  const t0 = Date.now();
  const res = http.post(
    `${baseUrl}/api/commandes`,
    JSON.stringify({
      tableId: tableId,
      clientRequestId: `full-sim-w${__VU}-i${__ITER}-${Date.now()}`,
      notes: 'Commande express plein rush',
      items: [
        {
          cocktailId: ((__ITER + __VU) % 15) + 1,
          quantite: 1,
          prixUnitaire: 9.50,
          prioritaire: false,
        },
      ],
    }),
    { headers: headers, tags: { name: 'FullSim_Waiter_Order' } }
  );

  if (res.status === 200 || res.status === 201) {
    apiP95Trend.add(Date.now() - t0);
    totalOrdersCreated.add(1);
  }

  sleep(2.5);
}

export function patronRun() {
  const baseUrl = DEFAULT_BASE_URL;
  const tableId = (__VU % 40) + 1;

  const t0 = Date.now();
  const res = http.get(`${baseUrl}/api/public/tables/${tableId}/cart`, {
    tags: { name: 'FullSim_Patron_Cart' },
  });

  if (res.status === 200) {
    apiP95Trend.add(Date.now() - t0);
  }

  sleep(3);
}

export function displayRun() {
  const baseUrl = DEFAULT_BASE_URL;
  const wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/ws';
  const token = authenticateUser('barman1', 'barman123', baseUrl);
  const t0 = Date.now();

  ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', function () {
      wsP95Trend.add(Date.now() - t0);
      socket.send(buildConnectFrame(token));
    });

    socket.on('message', function (data) {
      const frames = parseStompFrames(data);
      for (const frame of frames) {
        if (frame.command === 'CONNECTED') {
          socket.send(buildSubscribeFrame('/topic/commandes', `display-sub-${__VU}`));
        }
      }
    });

    socket.setTimeout(function () {
      socket.close();
    }, 25000);
  });

  sleep(2);
}

export function cashierRun() {
  const baseUrl = DEFAULT_BASE_URL;
  const headers = getAuthHeaders('manager', 'manager123', baseUrl);
  const tableId = (__ITER % 20) + 1;

  // Generate and settle bill
  const genRes = http.post(`${baseUrl}/api/factures/table/${tableId}/generer`, null, {
    headers: headers,
    tags: { name: 'FullSim_Generate_Bill' },
  });

  if (genRes.status === 200) {
    totalBillsSettled.add(1);
  }

  // Check thermal print queue status
  http.get(`${baseUrl}/api/printers/status`, {
    headers: headers,
    tags: { name: 'FullSim_Printer_Status' },
  });

  sleep(4);
}
