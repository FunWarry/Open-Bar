import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OnlinePaymentService } from '../../../app/core/services/online-payment.service';
import {
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentSuccessResponse,
  TableBillSummary
} from '../../../app/core/models/payment.model';
import { environment } from '../../../environments/environment';

describe('OnlinePaymentService', () => {
  let service: OnlinePaymentService;
  let httpMock: HttpTestingController;

  const mockBill: TableBillSummary = {
    tableId: 10,
    tableNumber: 4,
    activeOrdersCount: 1,
    totalItemsCount: 2,
    subtotalVatExcluded: 16.67,
    vatAmount: 3.33,
    subtotalVatIncluded: 20.0,
    alreadyPaidAmount: 0.0,
    remainingBalance: 20.0,
    isFullySettled: false,
    settlements: [],
    paymentProvider: 'SANDBOX',
    stripePublishableKey: 'pk_test_sample',
    currency: 'EUR',
    items: [
      {
        ligneId: 1,
        boissonNom: 'Mojito',
        quantite: 2,
        prixUnitaire: 10.0,
        totalLigne: 20.0,
        guestName: 'Alex',
        orderStatus: 'SERVIE',
        orderDate: '2026-10-27T12:00:00'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OnlinePaymentService]
    });

    service = TestBed.inject(OnlinePaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch table bill breakdown via GET', () => {
    service.getTableBill(10, 'Alex').subscribe(bill => {
      expect(bill).toEqual(mockBill);
      expect(bill.remainingBalance).toBe(20.0);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/public/tables/10/payments/bill?guestName=Alex`);
    expect(req.request.method).toBe('GET');
    req.flush(mockBill);
  });

  it('should create payment intent via POST', () => {
    const requestPayload: PaymentIntentRequest = {
      baseAmount: 25.0,
      tipAmount: 2.5,
      totalAmount: 27.5,
      splitMode: 'FULL',
      splitPersonsCount: null,
      guestName: 'Alex',
      email: 'alex@example.com'
    };

    const mockResponse: PaymentIntentResponse = {
      transactionId: 'tx_sim_001',
      clientSecret: 'secret_001',
      amount: 25.0,
      tipAmount: 2.5,
      provider: 'SANDBOX',
      totalAmount: 27.5,
      currency: 'EUR',
      status: 'PENDING'
    };

    service.createPaymentIntent(10, requestPayload).subscribe(res => {
      expect(res.transactionId).toBe('tx_sim_001');
      expect(res.totalAmount).toBe(27.5);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/public/tables/10/payments/intent`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestPayload);
    req.flush(mockResponse);
  });

  it('should confirm sandbox payment via POST', () => {
    const confirmReq = {
      transactionId: 'tx_sim_001',
      clientSecret: 'secret_001',
      paymentMethodType: 'card'
    };

    const mockSuccess: PaymentSuccessResponse = {
      transactionId: 'tx_sim_001',
      status: 'SUCCEEDED',
      baseAmount: 25.0,
      tipAmount: 2.5,
      totalAmount: 27.5,
      currency: 'EUR',
      remainingBalance: 0,
      isTableFullySettled: true,
      tableLiberated: true,
      receiptDownloadUrl: '/api/public/tables/10/payments/tx_sim_001/receipt.pdf'
    };

    service.confirmSandboxPayment(10, confirmReq).subscribe(res => {
      expect(res.status).toBe('SUCCEEDED');
      expect(res.tableLiberated).toBeTrue();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/public/tables/10/payments/confirm-sandbox`);
    expect(req.request.method).toBe('POST');
    req.flush(mockSuccess);
  });

  it('should liberate table via POST', () => {
    service.liberateTable(10, 'Alex').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/public/tables/10/payments/liberate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tableId: 10, guestName: 'Alex' });
    req.flush(null);
  });

  it('should send email receipt via POST', () => {
    service.sendReceiptEmail(10, 'tx_sim_001', 'test@example.com').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/public/tables/10/payments/tx_sim_001/receipt-email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com' });
    req.flush(null);
  });

  it('should construct correct receipt PDF download URL', () => {
    const url = service.getReceiptPdfUrl(10, 'tx_sim_001');
    expect(url).toBe(`${environment.apiUrl}/public/tables/10/payments/tx_sim_001/receipt.pdf`);
  });
});
