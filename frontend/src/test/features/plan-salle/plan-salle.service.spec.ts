import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PlanSalleService } from '../../../app/features/plan-salle/services/plan-salle.service';
import { TablePosition } from '../../../app/features/plan-salle/models/table-position.model';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'openbar_table_positions';

const mockPositions: TablePosition[] = [
  { tableId: 1, x: 100, y: 100, rotation: 0, shape: 'rect' },
  { tableId: 2, x: 200, y: 150, rotation: 90, shape: 'circle' },
];

describe('PlanSalleService', () => {
  let service: PlanSalleService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlanSalleService],
    });
    service = TestBed.inject(PlanSalleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(STORAGE_KEY);
  });

  // --- getPositions ---

  it('getPositions() appelle GET /api/tables/positions', () => {
    service.getPositions().subscribe(positions => {
      expect(positions).toEqual(mockPositions);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPositions);
  });

  it('getPositions() retourne [] en fallback si le backend échoue et le localStorage est vide', () => {
    service.getPositions().subscribe(positions => {
      expect(positions).toEqual([]);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    req.error(new ProgressEvent('error'));
  });

  it('getPositions() retourne les positions du localStorage en fallback si le backend échoue', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockPositions));
    service.getPositions().subscribe(positions => {
      expect(positions).toEqual(mockPositions);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    req.error(new ProgressEvent('error'));
  });

  // --- sauvegarderPositions ---

  it('sauvegarderPositions() appelle PUT /api/tables/positions', () => {
    service.sauvegarderPositions(mockPositions).subscribe(result => {
      expect(result).toEqual(mockPositions);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockPositions);
    req.flush(mockPositions);
  });

  it('sauvegarderPositions() persiste en localStorage', () => {
    service.sauvegarderPositions(mockPositions).subscribe();
    http.expectOne(`${environment.apiUrl}/tables/positions`).flush(mockPositions);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(stored).toEqual(mockPositions);
  });

  it('sauvegarderPositions() retourne les positions en fallback si le backend échoue', () => {
    service.sauvegarderPositions(mockPositions).subscribe(result => {
      expect(result).toEqual(mockPositions);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    req.error(new ProgressEvent('error'));
  });
});
