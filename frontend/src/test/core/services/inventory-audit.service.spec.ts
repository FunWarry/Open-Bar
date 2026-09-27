import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InventoryAuditService } from '../../../app/core/services/inventory-audit.service';
import {
  InventoryAuditSession,
  InventoryAuditItem,
  InventoryVarianceSummary,
  CreateInventoryAuditSessionRequest,
  UpdateInventoryAuditItemCountRequest,
} from '../../../app/core/models/inventory-audit.model';
import { environment } from '../../../environments/environment';

describe('InventoryAuditService', () => {
  let service: InventoryAuditService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/inventory-audits`;

  const mockSession: InventoryAuditSession = {
    id: 1,
    referenceCode: 'INV-20260927-001',
    title: 'Monthly Spirits Audit',
    status: 'IN_PROGRESS',
    storageLocationScope: 'ALL',
    categoryScope: 'ALCOHOL',
    createdByUsername: 'manager',
    createdAt: '2026-09-27T10:00:00Z',
    notes: 'Test notes',
    totalTheoreticalValueHt: 1000,
    totalCountedValueHt: 950,
    totalVarianceValueHt: -50,
    totalItemsCount: 5,
    countedItemsCount: 3,
  };

  const mockItem: InventoryAuditItem = {
    id: 10,
    ingredientId: 100,
    ingredientNom: 'Rhum Blanc',
    ingredientUnite: 'cl',
    ingredientCategory: 'ALCOHOL',
    packagingCapacity: 70,
    theoreticalQuantity: 140,
    countedQuantity: 105,
    varianceQuantity: -35,
    unitCostHt: 20,
    theoreticalValueHt: 2800,
    countedValueHt: 2100,
    varianceValueHt: -700,
    notes: 'Shrinkage noticed',
    locationCounts: [],
  };

  const mockSummary: InventoryVarianceSummary = {
    totalTheoreticalValueHt: 1000,
    totalCountedValueHt: 950,
    totalVarianceValueHt: -50,
    totalShrinkageValueHt: 60,
    totalSurplusValueHt: 10,
    totalItemsAudited: 5,
    itemsWithVarianceCount: 2,
    varianceValueByCategory: { ALCOHOL: -50 },
    countedValueByLocation: { MAIN_BAR: 950 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InventoryAuditService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(InventoryAuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllSessions should send GET and return audit session array', () => {
    service.getAllSessions().subscribe((sessions: InventoryAuditSession[]) => {
      expect(sessions).toHaveSize(1);
      expect(sessions[0].referenceCode).toBe('INV-20260927-001');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockSession]);
  });

  it('getSessionById should send GET with id and return detailed session', () => {
    service.getSessionById(1).subscribe((session: InventoryAuditSession) => {
      expect(session.id).toBe(1);
      expect(session.title).toBe('Monthly Spirits Audit');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSession);
  });

  it('createSession should send POST with payload and return created session', () => {
    const payload: CreateInventoryAuditSessionRequest = {
      title: 'New Audit',
      storageLocationScope: 'ALL',
      categoryScope: 'ALCOHOL',
      notes: 'Notes',
    };

    service.createSession(payload).subscribe((session: InventoryAuditSession) => {
      expect(session.id).toBe(1);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockSession);
  });

  it('startSession should send POST to /start and return updated session', () => {
    service.startSession(1).subscribe((session: InventoryAuditSession) => {
      expect(session.status).toBe('IN_PROGRESS');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/start`);
    expect(req.request.method).toBe('POST');
    req.flush(mockSession);
  });

  it('updateItemCount should send PUT to update single item counts', () => {
    const countReq: UpdateInventoryAuditItemCountRequest = {
      storageLocation: 'MAIN_BAR',
      fullContainersCount: 1,
      partialQuantity: 35,
      notes: 'Counted ok',
    };

    service.updateItemCount(1, 10, countReq).subscribe((item: InventoryAuditItem) => {
      expect(item.id).toBe(10);
      expect(item.varianceQuantity).toBe(-35);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/items/10`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(countReq);
    req.flush(mockItem);
  });

  it('getVarianceSummary should send GET to /summary and return variance metrics', () => {
    service.getVarianceSummary(1).subscribe((summary: InventoryVarianceSummary) => {
      expect(summary.totalShrinkageValueHt).toBe(60);
      expect(summary.itemsWithVarianceCount).toBe(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/summary`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);
  });

  it('finalizeSession should send POST to /finalize and return locked session', () => {
    service.finalizeSession(1).subscribe((session: InventoryAuditSession) => {
      expect(session.id).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/finalize`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockSession, status: 'FINALIZED' });
  });

  it('cancelSession should send POST to /cancel and return cancelled session', () => {
    service.cancelSession(1).subscribe((session: InventoryAuditSession) => {
      expect(session.status).toBe('CANCELLED');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/cancel`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockSession, status: 'CANCELLED' });
  });

  it('downloadPdf should send GET with responseType blob', () => {
    const mockBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

    service.downloadPdf(1).subscribe((blob: Blob) => {
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(`${baseUrl}/1/export/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('downloadCsv should send GET with responseType blob', () => {
    const mockBlob = new Blob(['Ref;Title;Status\n'], { type: 'text/csv' });

    service.downloadCsv(1).subscribe((blob: Blob) => {
      expect(blob.size).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/1/export/csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });
});
