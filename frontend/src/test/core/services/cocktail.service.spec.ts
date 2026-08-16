import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { environment } from '../../../environments/environment';

describe('CocktailService', () => {
  let service: CocktailService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/cocktails`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [CocktailService]
    });
    service = TestBed.inject(CocktailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll() appelle GET /api/cocktails', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getById() appelle GET /api/cocktails/:id', () => {
    service.getById(42).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/42`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getDisponibles() appelle GET /api/cocktails/disponibles', () => {
    service.getDisponibles().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/disponibles`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() appelle POST /api/cocktails', () => {
    const payload = { nom: 'Mojito', prix: 8.5 };
    service.create(payload).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('delete() appelle DELETE /api/cocktails/:id', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
