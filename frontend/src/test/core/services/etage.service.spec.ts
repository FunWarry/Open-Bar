import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EtageService, EtageBar } from '../../../app/core/services/etage.service';
import { environment } from '../../../environments/environment';

describe('EtageService', () => {
  let service: EtageService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/etages`;

  const mockEtage: EtageBar = {
    id: 1,
    code: 'RDC',
    nom: 'Rez-de-chaussée',
    ordre: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [EtageService]
    });
    service = TestBed.inject(EtageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all floors', () => {
    service.getAll().subscribe((etages) => {
      expect(etages).toHaveSize(1);
      expect(etages[0].code).toBe('RDC');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockEtage]);
  });

  it('should fetch floor by id', () => {
    service.getById(1).subscribe((etage) => {
      expect(etage.id).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEtage);
  });

  it('should create a new floor', () => {
    const payload: Partial<EtageBar> = { code: 'VIP', nom: 'Espace VIP', ordre: 10 };

    service.create(payload).subscribe((etage) => {
      expect(etage.code).toBe('VIP');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 2, ...payload });
  });

  it('should update a floor', () => {
    const payload: Partial<EtageBar> = { nom: 'Rez-de-chaussée Modifié' };

    service.update(1, payload).subscribe((etage) => {
      expect(etage.nom).toBe('Rez-de-chaussée Modifié');
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockEtage, nom: 'Rez-de-chaussée Modifié' });
  });

  it('should delete a floor', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
