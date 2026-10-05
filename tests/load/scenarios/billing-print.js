import http from 'k6/http';
import { check, sleep } from 'k6';
import { DEFAULT_BASE_URL, getAuthHeaders } from '../helpers/auth.js';

export const options = {
  scenarios: {
    billing_print_traffic: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
  },
  thresholds: {
    'http_req_duration{name:Generate_Invoice}': ['p(95)<120'],
    'http_req_duration{name:Test_Printer_Socket}': ['p(95)<150'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function billingPrintScenario() {
  const baseUrl = DEFAULT_BASE_URL;
  const managerHeaders = getAuthHeaders('manager', 'manager123', baseUrl);
  const tableId = (__VU % 10) + 1;

  // 1. Generate or retrieve pending invoice for active table
  const genRes = http.post(
    `${baseUrl}/api/factures/table/${tableId}/generer`,
    null,
    {
      headers: managerHeaders,
      tags: { name: 'Generate_Invoice' },
      responseCallback: http.expectedStatuses(200, 400, 404),
    }
  );

  check(genRes, {
    'generate invoice responds 200, 400 (if no active orders) or 404': (r) =>
      r.status === 200 || r.status === 400 || r.status === 404,
  });

  let invoiceId = null;
  if (genRes.status === 200) {
    try {
      const data = JSON.parse(genRes.body);
      invoiceId = data.id;
    } catch (e) {
      // ignore json parse error
    }
  }

  sleep(0.5);

  // 2. Direct ESC/POS thermal socket connectivity check on port 9100 (hits mock server)
  const testConnPayload = JSON.stringify({
    ip: '127.0.0.1',
    port: 9100,
    role: 'CASH_DESK',
  });

  const testConnRes = http.post(
    `${baseUrl}/api/printers/test-connection`,
    testConnPayload,
    {
      headers: managerHeaders,
      tags: { name: 'Test_Printer_Socket' },
    }
  );

  check(testConnRes, {
    'printer socket test responds 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. Settle table bill if an invoice exists
  if (invoiceId) {
    const encaissementPayload = JSON.stringify({
      modePaiement: 'CARTE',
      pourboire: 1.0,
      remiseMontant: 0,
      remisePourcentage: 0,
      libererTable: false,
    });

    const payRes = http.post(
      `${baseUrl}/api/factures/table/${tableId}/encaisser`,
      encaissementPayload,
      {
        headers: managerHeaders,
        tags: { name: 'Encaisser_Table' },
      }
    );

    check(payRes, {
      'settlement responds 200 or 400': (r) => r.status === 200 || r.status === 400,
    });

    // 4. Print invoice receipt to cash desk printer
    const printRes = http.post(
      `${baseUrl}/api/printers/invoices/${invoiceId}/receipt?openCashDrawer=false`,
      null,
      {
        headers: managerHeaders,
        tags: { name: 'Print_Receipt' },
      }
    );

    check(printRes, {
      'print receipt responds 200 or 500 (if printer offline)': (r) =>
        r.status === 200 || r.status === 500,
    });
  }

  sleep(1);
}
