import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { environment } from '../../../environments/environment';

describe('DashboardBarmanService', () => {
  let service: DashboardBarmanService;
  let httpMock: HttpTestingController;

  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [DashboardBarmanService]
    });

    service = TestBed.inject(DashboardBarmanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCommandesEnAttente() envoie un GET sur /api/commandes/statut/EN_ATTENTE', () => {
    service.getCommandesEnAttente().subscribe(data => {
      expect(data).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/statut/EN_ATTENTE`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, statut: 'EN_ATTENTE' }]);
  });

  it('getCommandesEnPreparation() envoie un GET sur /api/commandes/statut/EN_PREPARATION', () => {
    service.getCommandesEnPreparation().subscribe(data => {
      expect(data).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/statut/EN_PREPARATION`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 2, statut: 'EN_PREPARATION' }]);
  });

  it('getCommandesPret() envoie un GET sur /api/commandes/statut/PRET', () => {
    service.getCommandesPret().subscribe(data => {
      expect(data).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/statut/PRET`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 3, statut: 'PRET' }]);
  });

  it('changerStatut() envoie un PUT sur /api/commandes/{id}/statut', () => {
    service.changerStatut(42, 'PRET').subscribe(res => {
      expect(res.id).toBe(42);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/42/statut`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBe('PRET');
    req.flush({ id: 42, statut: 'PRET' });
  });

  it('getCocktails() envoie un GET sur /api/cocktails', () => {
    service.getCocktails().subscribe(data => {
      expect(data).toHaveSize(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/cocktails`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Mojito' }, { id: 2, nom: 'Cosmopolitan' }]);
  });

  it('getCocktailById() envoie un GET sur /api/cocktails/{id}', () => {
    service.getCocktailById(10).subscribe(cocktail => {
      expect(cocktail.nom).toBe('Margarita');
    });

    const req = httpMock.expectOne(`${apiUrl}/cocktails/10`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 10, nom: 'Margarita' });
  });

  it('toggleCocktailDisponibilite() envoie un PUT sur /api/cocktails/{id}/disponibilite', () => {
    service.toggleCocktailDisponibilite(5).subscribe(res => {
      expect(res.disponible).toBeFalse();
    });

    const req = httpMock.expectOne(`${apiUrl}/cocktails/5/disponibilite`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 5, nom: 'Gin Tonic', disponible: false });
  });

  it('getIngredients() envoie un GET sur /api/ingredients', () => {
    service.getIngredients().subscribe(data => {
      expect(data).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/ingredients`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Citron Vert' }]);
  });

  it('updateIngredientStock() envoie un PATCH sur /api/ingredients/{id}/stock', () => {
    service.updateIngredientStock(1, 50).subscribe(res => {
      expect(res.quantiteStock).toBe(50);
    });

    const req = httpMock.expectOne(`${apiUrl}/ingredients/1/stock`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ quantite: 50 });
    req.flush({ id: 1, nom: 'Citron Vert', quantiteStock: 50 });
  });
});
