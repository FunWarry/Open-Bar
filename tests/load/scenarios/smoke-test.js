import http from 'k6/http';
import { check, sleep } from 'k6';
import { DEFAULT_BASE_URL, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  vus: 5,
  duration: '15s',
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(90)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function smokeTestScenario() {
  const baseUrl = DEFAULT_BASE_URL;

  // 1. Health / Cocktails public access
  const cocktailsRes = http.get(`${baseUrl}/api/cocktails`, {
    tags: { name: 'Get_Cocktails' },
  });
  check(cocktailsRes, {
    'cocktails status is 200': (r) => r.status === 200,
  });

  // 2. Authenticated waiter request
  const headers = getAuthHeaders('serveur1', 'serveur123', baseUrl);
  const tablesRes = http.get(`${baseUrl}/api/tables`, {
    headers: headers,
    tags: { name: 'Get_Tables_Auth' },
  });
  check(tablesRes, {
    'tables status is 200': (r) => r.status === 200,
  });

  // 3. Public guest cart access
  const cartRes = http.get(`${baseUrl}/api/public/tables/1/cart`, {
    tags: { name: 'Get_Public_Cart' },
    responseCallback: http.expectedStatuses(200, 404),
  });
  check(cartRes, {
    'cart status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}
