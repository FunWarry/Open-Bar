import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { environment } from '../../../environments/environment';
import { FlavorProfile, CocktailFacets } from '../../../app/core/models/cocktail.model';

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

  it('getAll() calls GET /api/cocktails', () => {
    service.getAll().subscribe(res => expect(res).toEqual([]));
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getById() calls GET /api/cocktails/:id', () => {
    service.getById(42).subscribe(res => expect(res.id).toBe(42));
    const req = httpMock.expectOne(`${baseUrl}/42`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 42 });
  });

  it('getDisponibles() calls GET /api/cocktails/disponibles', () => {
    service.getDisponibles().subscribe(res => expect(res).toEqual([]));
    const req = httpMock.expectOne(`${baseUrl}/disponibles`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() calls POST /api/cocktails', () => {
    const payload = { nom: 'Mojito', prix: 8.5 };
    service.create(payload).subscribe(res => expect(res.nom).toBe('Mojito'));
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, ...payload });
  });

  it('update() calls PUT /api/cocktails/:id', () => {
    const payload = { nom: 'Mojito Royal', prix: 10.0 };
    service.update(1, payload).subscribe(res => expect(res.nom).toBe('Mojito Royal'));
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 1, ...payload });
  });

  it('delete() calls DELETE /api/cocktails/:id', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('toggleDisponibilite() calls PUT /api/cocktails/:id/disponibilite', () => {
    service.toggleDisponibilite(1).subscribe(res => expect(res.disponible).toBe(false));
    const req = httpMock.expectOne(`${baseUrl}/1/disponibilite`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({ id: 1, disponible: false });
  });

  it('search() calls GET /api/cocktails/search with query param', () => {
    service.search('mojito').subscribe(res => expect(res).toHaveSize(1));
    const req = httpMock.expectOne(r => r.url === `${baseUrl}/search` && r.params.get('nom') === 'mojito');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Mojito' }]);
  });

  it('updateSaisonnalite() calls PATCH /api/cocktails/:id/saisonnalite', () => {
    service.updateSaisonnalite(1, 5, 9).subscribe(res => expect(res.moisDebut).toBe(5));
    const req = httpMock.expectOne(`${baseUrl}/1/saisonnalite`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ moisDebut: 5, moisFin: 9 });
    req.flush({ id: 1, moisDebut: 5, moisFin: 9 });
  });

  it('uploadImage() calls POST /api/cocktails/:id/image with formData', () => {
    const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
    service.uploadImage(1, file).subscribe(res => expect(res.imageUrl).toBe('photo.png'));
    const req = httpMock.expectOne(`${baseUrl}/1/image`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ id: 1, imageUrl: 'photo.png' });
  });

  it('getFacets() calls GET /api/cocktails/facets and returns facets', () => {
    const mockFacets: CocktailFacets = {
      flavorCounts: { FRUITY: 5, SWEET: 4, SOUR: 3, BITTER: 2, SPICY: 1, SMOKY: 1, HERBAL: 3 },
      mocktailsCount: 3,
      veganCount: 8,
      glutenFreeCount: 7,
      lowAbvCount: 2,
      minAlcoholLevel: 0,
      maxAlcoholLevel: 25,
      totalAvailable: 10
    };

    service.getFacets().subscribe(facets => {
      expect(facets).toEqual(mockFacets);
      expect(facets.totalAvailable).toBe(10);
    });

    const req = httpMock.expectOne(`${baseUrl}/facets`);
    expect(req.request.method).toBe('GET');
    req.flush(mockFacets);
  });

  it('matchCocktails() without filters calls GET /api/cocktails/matcher with empty params', () => {
    service.matchCocktails({}).subscribe(res => expect(res).toEqual([]));
    const req = httpMock.expectOne(`${baseUrl}/matcher`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toHaveSize(0);
    req.flush([]);
  });

  it('matchCocktails() with full filter criteria serializes all query params', () => {
    service.matchCocktails({
      flavors: ['FRUITY', 'HERBAL'] as FlavorProfile[],
      mocktail: true,
      vegan: true,
      glutenFree: false,
      lowAbv: true,
      maxAlcohol: 12.5
    }).subscribe(res => {
      expect(res).toHaveSize(1);
    });

    const req = httpMock.expectOne(r =>
      r.url === `${baseUrl}/matcher` &&
      r.params.get('flavors') === 'FRUITY,HERBAL' &&
      r.params.get('mocktail') === 'true' &&
      r.params.get('vegan') === 'true' &&
      r.params.get('glutenFree') === 'false' &&
      r.params.get('lowAbv') === 'true' &&
      r.params.get('maxAlcohol') === '12.5'
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Virgin Mojito' }]);
  });

  it('getByIngredient() calls GET /api/cocktails/by-ingredient/:id', () => {
    service.getByIngredient(10).subscribe(res => {
      expect(res).toHaveSize(1);
      expect(res[0].nom).toBe('Mojito');
    });

    const req = httpMock.expectOne(`${baseUrl}/by-ingredient/10`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Mojito' }]);
  });

  it('setDisponibiliteBatch() calls PUT /api/cocktails/disponibilite-batch', () => {
    service.setDisponibiliteBatch([1, 2], false).subscribe(res => {
      expect(res).toHaveSize(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/disponibilite-batch`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ cocktailIds: [1, 2], disponible: false });
    req.flush([{ id: 1, disponible: false }, { id: 2, disponible: false }]);
  });
});

