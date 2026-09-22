import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PurchaseOrderService } from '../../../app/core/services/purchase-order.service';
import {
  PriceVariation,
  PurchaseOrder,
  PurchaseOrderCreateRequest,
  PurchaseOrderReceptionRequest
} from '../../../app/core/models/purchase-order.model';
import { environment } from '../../../environments/environment';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/purchase-orders`;

  const mockOrder: PurchaseOrder = {
    id: 10,
    numeroCommande: 'BC-2026-0001',
    supplierId: 1,
    supplierNom: 'Distillerie des Alpes',
    dateCommande: '2026-09-20T10:00:00',
    dateLivraisonPrevue: '2026-09-22',
    status: 'ORDERED',
    totalHt: 200,
    totalTva: 40,
    totalTtc: 240,
    items: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PurchaseOrderService]
    });
    service = TestBed.inject(PurchaseOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll() sends GET request without params when status is not provided', () => {
    service.getAll().subscribe(orders => {
      expect(orders).toEqual([mockOrder]);
      expect(orders).toHaveSize(1);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('status')).toBeFalse();
    req.flush([mockOrder]);
  });

  it('getAll() adds status query param when specified', () => {
    service.getAll('ORDERED').subscribe(orders => {
      expect(orders).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${baseUrl}?status=ORDERED`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('ORDERED');
    req.flush([mockOrder]);
  });

  it('getById() sends GET request to /api/purchase-orders/:id', () => {
    service.getById(10).subscribe(order => {
      expect(order).toEqual(mockOrder);
    });

    const req = httpMock.expectOne(`${baseUrl}/10`);
    expect(req.request.method).toBe('GET');
    req.flush(mockOrder);
  });

  it('create() sends POST request to /api/purchase-orders', () => {
    const payload: PurchaseOrderCreateRequest = {
      supplierId: 1,
      dateLivraisonPrevue: '2026-09-25',
      items: [
        { ingredientId: 10, quantiteCommandee: 5, prixUnitaireHt: 12, tauxTva: 20 }
      ]
    };

    service.create(payload).subscribe(created => {
      expect(created.id).toBe(10);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockOrder);
  });

  it('send() sends PATCH request to /api/purchase-orders/:id/send', () => {
    service.send(10).subscribe(updated => {
      expect(updated.id).toBe(10);
    });

    const req = httpMock.expectOne(`${baseUrl}/10/send`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockOrder);
  });

  it('receive() sends POST request to /api/purchase-orders/:id/receive', () => {
    const reception: PurchaseOrderReceptionRequest = {
      numeroBonLivraison: 'BL-99',
      receptions: [
        { purchaseOrderItemId: 10, quantiteLivree: 5, prixUnitaireHt: 12 }
      ]
    };

    const mockVariations: PriceVariation[] = [
      {
        ingredientId: 10,
        ingredientNom: 'Rhum Blanc',
        ancienPamp: 12,
        nouveauPamp: 13.5,
        dernierPrixAchat: 14,
        variationPourcentage: 16.67,
        alerteHausse: true
      }
    ];

    service.receive(10, reception).subscribe(variations => {
      expect(variations).toEqual(mockVariations);
      expect(variations).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/10/receive`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reception);
    req.flush(mockVariations);
  });

  it('cancel() sends PATCH request to /api/purchase-orders/:id/cancel', () => {
    service.cancel(10).subscribe(cancelled => {
      expect(cancelled.id).toBe(10);
    });

    const req = httpMock.expectOne(`${baseUrl}/10/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockOrder, status: 'CANCELLED' });
  });

  it('downloadPdf() sends GET request with blob responseType', () => {
    const mockBlob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });

    service.downloadPdf(10).subscribe(blob => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpMock.expectOne(`${baseUrl}/10/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });
});
