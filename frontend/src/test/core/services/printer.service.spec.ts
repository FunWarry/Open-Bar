import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PrinterService } from '../../../app/core/services/printer.service';
import { PrinterConnectionTestRequest, PrinterStatus, PrintResult } from '../../../app/core/models/printer.model';
import { environment } from '../../../environments/environment';

describe('PrinterService', () => {
  let service: PrinterService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/printers`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PrinterService],
    });
    service = TestBed.inject(PrinterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get printer status via GET /api/printers/status', () => {
    const mockStatus: PrinterStatus = {
      directPrintingEnabled: true,
      printerPort: 9100,
      barPrinterIp: '192.168.1.101',
      kitchenPrinterIp: '192.168.1.102',
      cashDeskPrinterIp: '192.168.1.103',
    };

    service.getStatus().subscribe(res => {
      expect(res).toEqual(mockStatus);
    });

    const req = httpMock.expectOne(`${baseUrl}/status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);
  });

  it('should trigger test print for BAR role via POST /api/printers/test/BAR', () => {
    const mockResult: PrintResult = {
      role: 'BAR',
      ip: '192.168.1.101',
      port: 9100,
      success: true,
      message: 'Test ticket transmitted successfully',
      durationMs: 15,
    };

    service.testPrintRole('BAR').subscribe(res => {
      expect(res).toEqual(mockResult);
    });

    const req = httpMock.expectOne(`${baseUrl}/test/BAR`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResult);
  });

  it('should test connection via POST /api/printers/test-connection', () => {
    const payload: PrinterConnectionTestRequest = {
      ip: '192.168.1.200',
      port: 9100,
    };
    const mockResult: PrintResult = {
      role: null,
      ip: '192.168.1.200',
      port: 9100,
      success: true,
      message: 'Socket connection successful',
      durationMs: 10,
    };

    service.testConnection(payload).subscribe(res => {
      expect(res).toEqual(mockResult);
    });

    const req = httpMock.expectOne(`${baseUrl}/test-connection`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResult);
  });

  it('should dispatch order tickets via POST /api/printers/orders/:id/dispatch', () => {
    const orderId = 42;
    const mockResults: PrintResult[] = [
      { role: 'BAR', ip: '192.168.1.101', port: 9100, success: true, message: 'OK', durationMs: 12 },
      { role: 'KITCHEN', ip: '192.168.1.102', port: 9100, success: true, message: 'OK', durationMs: 14 },
    ];

    service.dispatchOrder(orderId).subscribe(res => {
      expect(res).toEqual(mockResults);
      expect(res).toHaveSize(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/orders/${orderId}/dispatch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResults);
  });

  it('should print invoice receipt with cash drawer pulse via POST /api/printers/invoices/:id/receipt', () => {
    const invoiceId = 88;
    const mockResult: PrintResult = {
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: true,
      message: 'Receipt printed and cash drawer opened',
      durationMs: 25,
    };

    service.printInvoiceReceipt(invoiceId, true).subscribe(res => {
      expect(res).toEqual(mockResult);
    });

    const req = httpMock.expectOne(`${baseUrl}/invoices/${invoiceId}/receipt?openCashDrawer=true`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('openCashDrawer')).toBe('true');
    req.flush(mockResult);
  });

  it('should print invoice receipt without cash drawer pulse if requested', () => {
    const invoiceId = 88;
    const mockResult: PrintResult = {
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: true,
      message: 'Receipt printed',
      durationMs: 20,
    };

    service.printInvoiceReceipt(invoiceId, false).subscribe(res => {
      expect(res).toEqual(mockResult);
    });

    const req = httpMock.expectOne(`${baseUrl}/invoices/${invoiceId}/receipt?openCashDrawer=false`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('openCashDrawer')).toBe('false');
    req.flush(mockResult);
  });

  it('should open cash drawer via POST /api/printers/cash-drawer/open', () => {
    const mockResult: PrintResult = {
      role: 'CASH_DESK',
      ip: '192.168.1.103',
      port: 9100,
      success: true,
      message: 'Cash drawer kick pulse sent',
      durationMs: 8,
    };

    service.openCashDrawer().subscribe(res => {
      expect(res).toEqual(mockResult);
    });

    const req = httpMock.expectOne(`${baseUrl}/cash-drawer/open`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResult);
  });
});
