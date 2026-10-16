import http from 'k6/http';
import { check, sleep } from 'k6';
import { DEFAULT_BASE_URL } from '../helpers/auth.js';

export const options = {
  scenarios: {
    patron_cart_traffic: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 25 }, // Ramp up to 25 concurrent patrons
        { duration: '30s', target: 25 }, // Steady state rush hour cart usage
        { duration: '10s', target: 0 },  // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    'http_req_duration{name:Get_Table_Cart}': ['p(95)<80'],
    'http_req_duration{name:Add_Cart_Item}': ['p(95)<100'],
    'http_req_failed': ['rate<0.02'],
  },
};

export default function patronCartScenario() {
  const baseUrl = DEFAULT_BASE_URL;
  // Distribute patrons across tables 1 to 10
  const tableId = (__VU % 10) + 1;
  const guestSessionId = `session-vu-${__VU}-${__ITER}`;
  const guestName = `Client_${__VU}`;

  // 1. Patron opens table QR link and checks existing collaborative cart
  const cartRes = http.get(`${baseUrl}/api/public/tables/${tableId}/cart`, {
    tags: { name: 'Get_Table_Cart' },
    responseCallback: http.expectedStatuses(200, 404),
  });
  check(cartRes, {
    'cart GET responds 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.5);

  // 2. Patron adds a cocktail to the table cart
  const cocktailId = ((__ITER + __VU) % 15) + 1;
  const addItemPayload = JSON.stringify({
    guestSessionId: guestSessionId,
    guestName: guestName,
    cocktailId: cocktailId,
    quantite: 1,
    notes: 'Glacons svp',
  });

  const addItemRes = http.post(
    `${baseUrl}/api/public/tables/${tableId}/cart/items`,
    addItemPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Add_Cart_Item' },
      responseCallback: http.expectedStatuses(200, 201, 400),
    }
  );

  check(addItemRes, {
    'add item status is 201 or 200 (or 400 if QR module disabled)': (r) =>
      r.status === 201 || r.status === 200 || r.status === 400,
  });

  sleep(1);

  // 3. Patron refreshes cart to check other guests additions
  const refreshedCartRes = http.get(`${baseUrl}/api/public/tables/${tableId}/cart`, {
    tags: { name: 'Get_Table_Cart' },
    responseCallback: http.expectedStatuses(200, 404),
  });
  check(refreshedCartRes, {
    'refreshed cart responds 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1.5);
}
