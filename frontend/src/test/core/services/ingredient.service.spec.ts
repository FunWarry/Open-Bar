import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { environment } from '../../../environments/environment';

describe('IngredientService', () => {
  let service: IngredientService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/ingredients`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IngredientService]
    });
    service = TestBed.inject(IngredientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll() appelle GET /api/ingredients', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getAll() retourne la liste des ingrédients', () => {
    const mockIngredients = [
      { id: 1, nom: 'Rhum', quantiteStock: 10, seuilAlerte: 2 },
      { id: 2, nom: 'Citron', quantiteStock: 5, seuilAlerte: 1 }
    ];
    service.getAll().subscribe(result => {
      expect(result).toEqual(mockIngredients);
      expect(result.length).toBe(2);
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush(mockIngredients);
  });

  it('getById() appelle GET /api/ingredients/:id', () => {
    service.getById(42).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/42`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getById() retourne un ingrédient par son id', () => {
    const mockIngredient = { id: 42, nom: 'Menthe', quantiteStock: 3, seuilAlerte: 1 };
    service.getById(42).subscribe(result => {
      expect(result).toEqual(mockIngredient);
    });
    const req = httpMock.expectOne(`${baseUrl}/42`);
    req.flush(mockIngredient);
  });

  it('getById() propage une erreur 404 si ingrédient introuvable', () => {
    let errorReceived = false;
    service.getById(999).subscribe({
      next: () => fail('Devrait échouer'),
      error: err => {
        errorReceived = true;
        expect(err.status).toBe(404);
      }
    });
    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorReceived).toBeTrue();
  });

  it('create() appelle POST /api/ingredients avec le bon body', () => {
    const payload = { nom: 'Sucre', quantiteStock: 20, seuilAlerte: 5 };
    service.create(payload).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 10, ...payload });
  });

  it('create() retourne l\'ingrédient créé', () => {
    const payload = { nom: 'Sucre', quantiteStock: 20 };
    const mockResponse = { id: 10, nom: 'Sucre', quantiteStock: 20, seuilAlerte: 0 };
    service.create(payload).subscribe(result => {
      expect(result).toEqual(mockResponse);
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush(mockResponse);
  });

  it('create() propage une erreur 500 en cas d\'échec serveur', () => {
    let errorReceived = false;
    service.create({ nom: 'Test' }).subscribe({
      next: () => fail('Devrait échouer'),
      error: err => {
        errorReceived = true;
        expect(err.status).toBe(500);
      }
    });
    const req = httpMock.expectOne(baseUrl);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    expect(errorReceived).toBeTrue();
  });

  it('update() appelle PUT /api/ingredients/:id avec le bon body', () => {
    const payload = { nom: 'Menthe fraîche', quantiteStock: 8 };
    service.update(3, payload).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 3, ...payload });
  });

  it('update() retourne l\'ingrédient mis à jour', () => {
    const payload = { nom: 'Menthe fraîche' };
    const mockResponse = { id: 3, nom: 'Menthe fraîche', quantiteStock: 8, seuilAlerte: 2 };
    service.update(3, payload).subscribe(result => {
      expect(result).toEqual(mockResponse);
    });
    const req = httpMock.expectOne(`${baseUrl}/3`);
    req.flush(mockResponse);
  });

  it('delete() appelle DELETE /api/ingredients/:id', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('delete() propage une erreur 404 si ingrédient introuvable', () => {
    let errorReceived = false;
    service.delete(999).subscribe({
      next: () => fail('Devrait échouer'),
      error: err => {
        errorReceived = true;
        expect(err.status).toBe(404);
      }
    });
    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorReceived).toBeTrue();
  });

  it('updateStock() appelle PATCH /api/ingredients/:id/stock avec la quantité', () => {
    service.updateStock(5, 15).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/5/stock`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ quantite: 15 });
    req.flush({});
  });

  it('updateStock() retourne l\'ingrédient avec le stock mis à jour', () => {
    const mockResponse = { id: 5, nom: 'Rhum', quantiteStock: 15, seuilAlerte: 3 };
    service.updateStock(5, 15).subscribe(result => {
      expect(result).toEqual(mockResponse);
    });
    const req = httpMock.expectOne(`${baseUrl}/5/stock`);
    req.flush(mockResponse);
  });

  it('setSeuilAlerte() appelle PATCH /api/ingredients/:id/seuil-alerte avec le seuil', () => {
    service.setSeuilAlerte(7, 3).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/7/seuil-alerte`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ seuil: 3 });
    req.flush({});
  });

  it('setSeuilAlerte() retourne l\'ingrédient avec le nouveau seuil', () => {
    const mockResponse = { id: 7, nom: 'Citron', quantiteStock: 4, seuilAlerte: 3 };
    service.setSeuilAlerte(7, 3).subscribe(result => {
      expect(result).toEqual(mockResponse);
    });
    const req = httpMock.expectOne(`${baseUrl}/7/seuil-alerte`);
    req.flush(mockResponse);
  });

  it('search() appelle GET /api/ingredients/search avec le paramètre nom', () => {
    service.search('Rhum').subscribe();
    const req = httpMock.expectOne(r => r.url === `${baseUrl}/search` && r.params.get('nom') === 'Rhum');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('search() retourne la liste filtrée des ingrédients', () => {
    const mockResults = [{ id: 1, nom: 'Rhum blanc', quantiteStock: 10, seuilAlerte: 2 }];
    service.search('Rhum').subscribe(result => {
      expect(result).toEqual(mockResults);
      expect(result.length).toBe(1);
    });
    const req = httpMock.expectOne(r => r.url === `${baseUrl}/search` && r.params.get('nom') === 'Rhum');
    req.flush(mockResults);
  });

  it('search() retourne une liste vide si aucun résultat', () => {
    service.search('XYZ inconnu').subscribe(result => {
      expect(result).toEqual([]);
    });
    const req = httpMock.expectOne(r => r.url === `${baseUrl}/search` && r.params.get('nom') === 'XYZ inconnu');
    req.flush([]);
  });

  it('getEnAlerte() appelle GET /api/ingredients/alerte', () => {
    service.getEnAlerte().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/alerte`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getEnAlerte() retourne les ingrédients sous le seuil d\'alerte', () => {
    const mockAlerte = [
      { id: 2, nom: 'Citron', quantiteStock: 1, seuilAlerte: 3 },
      { id: 4, nom: 'Glace', quantiteStock: 0, seuilAlerte: 5 }
    ];
    service.getEnAlerte().subscribe(result => {
      expect(result).toEqual(mockAlerte);
      expect(result.length).toBe(2);
    });
    const req = httpMock.expectOne(`${baseUrl}/alerte`);
    req.flush(mockAlerte);
  });

  it('getEnAlerte() propage une erreur 500 en cas d\'échec serveur', () => {
    let errorReceived = false;
    service.getEnAlerte().subscribe({
      next: () => fail('Devrait échouer'),
      error: err => {
        errorReceived = true;
        expect(err.status).toBe(500);
      }
    });
    const req = httpMock.expectOne(`${baseUrl}/alerte`);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    expect(errorReceived).toBeTrue();
  });
});
