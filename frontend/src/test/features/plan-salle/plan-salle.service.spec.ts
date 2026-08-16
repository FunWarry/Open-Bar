import { getTranslocoTestingModule } from '../../transloco-testing.module';
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
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
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

  it('getPositions() appelle GET /api/tables/positions et mappe le format backend', () => {
    const backendDto = [
      { id: 1, planX: 100, planY: 100, planRotation: 0, planForme: 'RECTANGLE', etage: 'RDC', zone: 'TERRASSE' },
      { id: 2, planX: 200, planY: 150, planRotation: 90, planForme: 'RONDE', etage: '1er Étage', zone: 'INTERIEUR' },
    ];

    service.getPositions().subscribe(positions => {
      expect(positions).toEqual([
        { tableId: 1, x: 100, y: 100, width: undefined, height: undefined, rotation: 0, shape: 'rect', floor: 'RDC', zone: 'TERRASSE' },
        { tableId: 2, x: 200, y: 150, width: undefined, height: undefined, rotation: 90, shape: 'circle', floor: '1er Étage', zone: 'INTERIEUR' },
      ]);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    expect(req.request.method).toBe('GET');
    req.flush(backendDto);
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

  it('sauvegarderPositions() appelle PUT /api/tables/positions avec le payload DTO', () => {
    service.sauvegarderPositions(mockPositions).subscribe(result => {
      expect(result).toEqual(mockPositions);
    });
    const req = http.expectOne(`${environment.apiUrl}/tables/positions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([
      { id: 1, planX: 100, planY: 100, planRotation: 0, planForme: 'RECTANGLE', planWidth: null, planHeight: null },
      { id: 2, planX: 200, planY: 150, planRotation: 90, planForme: 'RONDE', planWidth: null, planHeight: null },
    ]);
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
