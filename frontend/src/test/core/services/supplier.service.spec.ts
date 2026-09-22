import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SupplierService } from '../../../app/core/services/supplier.service';
import { Supplier, SupplierCreateRequest } from '../../../app/core/models/supplier.model';
import { environment } from '../../../environments/environment';

describe('SupplierService', () => {
  let service: SupplierService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/suppliers`;

  const mockSupplier: Supplier = {
    id: 1,
    nom: 'Brasserie du Mont-Blanc',
    contactNom: 'Sylvain Favre',
    email: 'contact@montblanc.fr',
    telephone: '+33 4 50 00 00 00',
    adresse: '125 Rue des Brasseurs',
    codePostal: '74000',
    ville: 'Annecy',
    siret: '43920192800025',
    notes: 'Craft beer',
    actif: true,
    createdAt: '2026-09-01T10:00:00',
    updatedAt: '2026-09-01T10:00:00'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SupplierService]
    });
    service = TestBed.inject(SupplierService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll() sends GET request to /api/suppliers', () => {
    service.getAll().subscribe(suppliers => {
      expect(suppliers).toEqual([mockSupplier]);
      expect(suppliers).toHaveSize(1);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockSupplier]);
  });

  it('getActive() sends GET request to /api/suppliers/active', () => {
    service.getActive().subscribe(suppliers => {
      expect(suppliers).toHaveSize(1);
      expect(suppliers[0].actif).toBeTrue();
    });

    const req = httpMock.expectOne(`${baseUrl}/active`);
    expect(req.request.method).toBe('GET');
    req.flush([mockSupplier]);
  });

  it('getById() sends GET request to /api/suppliers/:id', () => {
    service.getById(1).subscribe(supplier => {
      expect(supplier).toEqual(mockSupplier);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSupplier);
  });

  it('create() sends POST request to /api/suppliers', () => {
    const newReq: SupplierCreateRequest = {
      nom: 'Distillerie des Alpes',
      contactNom: 'Marc Veyrat',
      email: 'marc@alpes.fr',
      telephone: '+33 4 79 00 00 00',
      adresse: '48 Chemin des Alambics',
      codePostal: '73000',
      ville: 'Chambéry',
      siret: '51283920100018',
      notes: 'Spirits',
      actif: true
    };

    service.create(newReq).subscribe(created => {
      expect(created.id).toBe(1);
      expect(created.nom).toBe('Brasserie du Mont-Blanc');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newReq);
    req.flush(mockSupplier);
  });

  it('update() sends PUT request to /api/suppliers/:id', () => {
    const updateReq: SupplierCreateRequest = {
      nom: 'Brasserie du Mont-Blanc SAS',
      actif: true
    };

    service.update(1, updateReq).subscribe(updated => {
      expect(updated.id).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockSupplier);
  });

  it('delete() sends DELETE request to /api/suppliers/:id', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('migrateLegacy() sends POST request to /api/suppliers/migrate-legacy', () => {
    service.migrateLegacy().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/migrate-legacy`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
