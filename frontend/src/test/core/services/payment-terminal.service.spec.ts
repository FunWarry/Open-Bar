import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { PaymentTerminalService } from '../../../app/core/services/payment-terminal.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { environment } from '../../../environments/environment';
import {
  TpePaymentRequest,
  TpePaymentResponse,
  TpeConnectionTestRequest,
  TpeConnectionTestResponse,
  TpePublicConfig
} from '../../../app/core/models/tpe.model';

describe('PaymentTerminalService', () => {
  let service: PaymentTerminalService;
  let httpMock: HttpTestingController;
  let wsMock: jasmine.SpyObj<WebSocketService>;
  let wsSubject: Subject<any>;

  const apiUrl = `${environment.apiUrl}/tpe`;

  beforeEach(() => {
    wsSubject = new Subject<any>();
    wsMock = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsMock.watch.and.returnValue(wsSubject.asObservable());

    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        PaymentTerminalService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WebSocketService, useValue: wsMock }
      ]
    });

    service = TestBed.inject(PaymentTerminalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created and subscribe to /topic/payments WebSocket topic', () => {
    expect(service).toBeTruthy();
    expect(wsMock.watch).toHaveBeenCalledWith('/topic/payments');
  });

  it('should dispatch initiatePayment POST to /api/tpe/pay', () => {
    const request: TpePaymentRequest = {
      amount: 19.50,
      targetRole: 'BAR',
      tableNumber: 'Table 4'
    };

    const mockResponse: TpePaymentResponse = {
      transactionId: 'tx-1234',
      status: 'WAITING_CARD',
      amount: 19.50,
      currencyCode: 'EUR',
      timestamp: new Date().toISOString()
    };

    service.initiatePayment(request).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/pay`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should dispatch cancelPayment POST to /api/tpe/cancel/{txId}', () => {
    const mockResponse: TpePaymentResponse = {
      transactionId: 'tx-1234',
      status: 'CANCELLED',
      amount: 19.50,
      currencyCode: 'EUR',
      timestamp: new Date().toISOString()
    };

    service.cancelPayment('tx-1234').subscribe((res) => {
      expect(res.status).toBe('CANCELLED');
    });

    const req = httpMock.expectOne(`${apiUrl}/cancel/tx-1234`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should dispatch getStatus GET to /api/tpe/status/{txId}', () => {
    const mockResponse: TpePaymentResponse = {
      transactionId: 'tx-1234',
      status: 'APPROVED',
      amount: 19.50,
      currencyCode: 'EUR',
      authorizationCode: 'AUTH888',
      timestamp: new Date().toISOString()
    };

    service.getStatus('tx-1234').subscribe((res) => {
      expect(res.status).toBe('APPROVED');
      expect(res.authorizationCode).toBe('AUTH888');
    });

    const req = httpMock.expectOne(`${apiUrl}/status/tx-1234`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should stream transaction updates filtered by transactionId in watchTransaction', (done) => {
    const event1: TpePaymentResponse = {
      transactionId: 'tx-other',
      status: 'WAITING_CARD',
      amount: 10,
      currencyCode: 'EUR',
      timestamp: new Date().toISOString()
    };

    const event2: TpePaymentResponse = {
      transactionId: 'tx-target',
      status: 'APPROVED',
      amount: 25.50,
      currencyCode: 'EUR',
      authorizationCode: 'AUTH-OK',
      timestamp: new Date().toISOString()
    };

    service.watchPayment('tx-target').subscribe((res) => {
      expect(res.transactionId).toBe('tx-target');
      expect(res.status).toBe('APPROVED');
      done();
    });

    // Simulate STOMP messages
    wsSubject.next({ body: JSON.stringify(event1) });
    wsSubject.next({ body: JSON.stringify(event2) });
  });

  it('should dispatch testConnection POST to /api/tpe/test-connection', () => {
    const request: TpeConnectionTestRequest = {
      ip: '192.168.1.150',
      port: 8888,
      terminalId: 'POS01'
    };

    const mockResponse: TpeConnectionTestResponse = {
      success: true,
      message: 'OK',
      responseTimeMs: 35
    };

    service.testConnection(request).subscribe((res) => {
      expect(res.success).toBeTrue();
      expect(res.responseTimeMs).toBe(35);
    });

    const req = httpMock.expectOne(`${apiUrl}/test-connection`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should dispatch getConfig GET to /api/tpe/config', () => {
    const mockConfig: TpePublicConfig = {
      enabled: true,
      simulatorEnabled: true,
      barIpConfigured: true,
      floorIpConfigured: false,
      port: 8888,
      terminalId: 'POS01',
      timeoutSeconds: 90
    };

    service.getConfig().subscribe((res) => {
      expect(res.enabled).toBeTrue();
      expect(res.simulatorEnabled).toBeTrue();
    });

    const req = httpMock.expectOne(`${apiUrl}/config`);
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);
  });

  it('should persist and retrieve preferred terminal role in localStorage', () => {
    expect(service.preferredRole).toBe('BAR');

    service.preferredRole = 'FLOOR';
    expect(service.preferredRole).toBe('FLOOR');
    expect(localStorage.getItem('openbar_preferred_tpe_role')).toBe('FLOOR');

    service.preferredRole = 'BAR';
    expect(service.preferredRole).toBe('BAR');
    expect(localStorage.getItem('openbar_preferred_tpe_role')).toBe('BAR');
  });
});
