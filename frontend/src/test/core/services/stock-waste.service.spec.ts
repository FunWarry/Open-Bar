import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StockWasteService } from '../../../app/core/services/stock-waste.service';
import { StockWasteRequest, StockMovement, StockWasteSummary } from '../../../app/core/models/stock-waste.model';
import { environment } from '../../../environments/environment';

describe('StockWasteService', () => {
  let service: StockWasteService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/stock`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StockWasteService]
    });
    service = TestBed.inject(StockWasteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('recordWaste', () => {
    it('should call POST /api/stock/waste with correct body and return created movement', () => {
      const request: StockWasteRequest = {
        ingredientId: 42,
        quantity: 5,
        reason: 'CASSE',
        notes: 'Broken during rush'
      };

      const mockResponse: StockMovement = {
        id: 101,
        ingredientId: 42,
        ingredientNom: 'Rhum Blanc',
        quantity: 5,
        unit: 'cl',
        reason: 'CASSE',
        reportedByUsername: 'barman1',
        notes: 'Broken during rush',
        cost: 2.50,
        recordedAt: '2026-09-06T15:00:00Z'
      };

      service.recordWaste(request).subscribe(res => {
        expect(res).toEqual(mockResponse);
        expect(res.cost).toBe(2.50);
      });

      const req = httpMock.expectOne(`${baseUrl}/waste`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should propagate 400 error when inventory is insufficient', () => {
      const request: StockWasteRequest = {
        ingredientId: 42,
        quantity: 100,
        reason: 'PEREMPTION',
        notes: 'Expired stock'
      };

      let errorStatus = 0;
      service.recordWaste(request).subscribe({
        next: () => fail('Should have failed with 400'),
        error: err => {
          errorStatus = err.status;
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/waste`);
      req.flush('Insufficient stock', { status: 400, statusText: 'Bad Request' });
      expect(errorStatus).toBe(400);
    });
  });

  describe('getMovements', () => {
    it('should call GET /api/stock/movements and return list of movements', () => {
      const mockMovements: StockMovement[] = [
        {
          id: 1,
          ingredientId: 10,
          ingredientNom: 'Vodka',
          quantity: 2,
          unit: 'cl',
          reason: 'DEGUSTATION_STAFF',
          reportedByUsername: 'manager',
          notes: 'Team cocktail test',
          cost: 0.80,
          recordedAt: '2026-09-06T14:30:00Z'
        }
      ];

      service.getMovements().subscribe(res => {
        expect(res).toEqual(mockMovements);
        expect(res).toHaveSize(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/movements`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMovements);
    });

    it('should call GET /api/stock/movements with ingredientId param when provided', () => {
      service.getMovements(42).subscribe(res => {
        expect(res).toBeDefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/movements?ingredientId=42`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getWasteSummary', () => {
    it('should call GET /api/stock/waste/summary and return summary metrics', () => {
      const mockSummary: StockWasteSummary = {
        totalMovements: 5,
        totalLossValue: 14.80,
        totalQuantityLost: 17.5,
        lossValueByReason: {
          CASSE: 12.5,
          PEREMPTION: 2.3,
          OFFERT_PATRON: 0,
          DEGUSTATION_STAFF: 0,
          ERREUR_PREPARATION: 0
        },
        countByReason: {
          CASSE: 3,
          PEREMPTION: 2,
          OFFERT_PATRON: 0,
          DEGUSTATION_STAFF: 0,
          ERREUR_PREPARATION: 0
        }
      };

      service.getWasteSummary().subscribe(res => {
        expect(res).toEqual(mockSummary);
        expect(res.totalLossValue).toBe(14.80);
      });

      const req = httpMock.expectOne(`${baseUrl}/waste/summary`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSummary);
    });
  });
});
