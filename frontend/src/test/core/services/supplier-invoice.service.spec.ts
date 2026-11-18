import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SupplierInvoiceService } from '../../../app/core/services/supplier-invoice.service';
import {
  SupplierInvoice,
  SupplierInvoiceUploadResponse,
  SupplierInvoiceReconciliation,
  SupplierInvoiceComplianceReport,
  SupplierInvoiceReconcileRequest
} from '../../../app/core/models/supplier-invoice.model';
import { environment } from '../../../environments/environment';

describe('SupplierInvoiceService', () => {
  let service: SupplierInvoiceService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/purchases/invoices`;

  const mockInvoice: SupplierInvoice = {
    id: 1,
    invoiceNumber: 'INV-2026-001',
    supplierId: 10,
    supplierName: 'Metro Cash & Carry',
    invoiceDate: '2026-03-15',
    dueDate: '2026-04-15',
    totalHt: 250.0,
    totalVat: 50.0,
    totalTtc: 300.0,
    currency: 'EUR',
    status: 'PENDING_REVIEW',
    format: 'FACTUR_X',
    profile: 'EN 16931',
    fileName: 'invoice.xml',
    fileChecksum: 'abc12345',
    legalComplianceStatus: 'COMPLIANT',
    createdAt: '2026-03-15T10:00:00',
    updatedAt: '2026-03-15T10:00:00',
    items: [
      {
        id: 101,
        lineNumber: 1,
        designation: 'Gin Bombay Sapphire 70cl',
        quantityInvoiced: 6,
        unitPriceHt: 18.5,
        vatRate: 20,
        lineTotalHt: 111.0,
        lineTotalTtc: 133.2,
        reconciliationStatus: 'MATCHED',
        matchedIngredientId: 50,
        matchedIngredientName: 'Gin Bombay'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SupplierInvoiceService]
    });

    service = TestBed.inject(SupplierInvoiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should upload an invoice file and return response', () => {
    const mockFile = new File(['<xml></xml>'], 'facturx.xml', { type: 'application/xml' });
    const mockResponse: SupplierInvoiceUploadResponse = {
      invoice: mockInvoice,
      duplicate: false,
      message: 'Successfully imported Factur-X invoice',
      warnings: []
    };

    service.uploadInvoice(mockFile).subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(res.duplicate).toBeFalse();
    });

    const req = httpMock.expectOne(`${baseUrl}/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush(mockResponse);
  });

  it('should fetch invoices with optional filters', () => {
    service.getInvoices('PENDING_REVIEW', 10).subscribe((invoices) => {
      expect(invoices).toHaveSize(1);
      expect(invoices[0].invoiceNumber).toBe('INV-2026-001');
    });

    const req = httpMock.expectOne((r) =>
      r.url === baseUrl &&
      r.params.get('status') === 'PENDING_REVIEW' &&
      r.params.get('supplierId') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockInvoice]);
  });

  it('should fetch a single invoice by id', () => {
    service.getInvoiceById(1).subscribe((invoice) => {
      expect(invoice.id).toBe(1);
      expect(invoice.supplierName).toBe('Metro Cash & Carry');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInvoice);
  });

  it('should get reconciliation preview with optional purchase order id', () => {
    const mockReconciliation: SupplierInvoiceReconciliation = {
      invoiceId: 1,
      invoiceNumber: 'INV-2026-001',
      supplierId: 10,
      supplierName: 'Metro Cash & Carry',
      selectedPurchaseOrderId: 42,
      selectedPurchaseOrderReference: 'PO-2026-0042',
      invoicedTotalHt: 250.0,
      orderedTotalHt: 250.0,
      totalHtVariance: 0.0,
      status: 'PENDING_REVIEW',
      lines: [],
      candidatePurchaseOrders: [],
      canAutoApply: true,
      reconciliationWarnings: []
    };

    service.getReconciliationPreview(1, 42).subscribe((rec) => {
      expect(rec.invoiceId).toBe(1);
      expect(rec.selectedPurchaseOrderId).toBe(42);
      expect(rec.canAutoApply).toBeTrue();
    });

    const req = httpMock.expectOne((r) =>
      r.url === `${baseUrl}/1/reconcile-preview` &&
      r.params.get('purchaseOrderId') === '42'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockReconciliation);
  });

  it('should reconcile invoice with adjustments', () => {
    const request: SupplierInvoiceReconcileRequest = {
      purchaseOrderId: 42,
      reconciliationNotes: 'Verified with delivery slip',
      itemAdjustments: []
    };

    service.reconcileInvoice(1, request).subscribe((invoice) => {
      expect(invoice.status).toBe('RECONCILED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/reconcile`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ ...mockInvoice, status: 'RECONCILED' });
  });

  it('should apply invoice to inventory', () => {
    service.applyInvoice(1).subscribe((invoice) => {
      expect(invoice.status).toBe('APPLIED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/apply`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockInvoice, status: 'APPLIED' });
  });

  it('should audit invoice compliance', () => {
    const mockReport: SupplierInvoiceComplianceReport = {
      status: 'COMPLIANT',
      hasMandatoryLegalMentions: true,
      hasValidSiren: true,
      hasValidVatBreakdown: true,
      isMathConsistent: true,
      complianceIssues: [],
      complianceWarnings: []
    };

    service.getComplianceReport(1).subscribe((report) => {
      expect(report.status).toBe('COMPLIANT');
      expect(report.hasValidSiren).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/1/compliance`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);
  });

  it('should download Factur-X XML data as blob', () => {
    const mockXmlBlob = new Blob(['<xml></xml>'], { type: 'application/xml' });

    service.downloadXml(1).subscribe((blob) => {
      expect(blob.type).toBe('application/xml');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/download-xml`);
    expect(req.request.method).toBe('GET');
    req.flush(mockXmlBlob);
  });

  it('should delete invoice', () => {
    service.deleteInvoice(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
