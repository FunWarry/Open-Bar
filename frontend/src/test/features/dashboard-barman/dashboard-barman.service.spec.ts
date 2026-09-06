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

  it('changerItemStatut() sends a PATCH to /api/commandes/{id}/items/{itemId}/statut', () => {
    service.changerItemStatut(10, 20, 'PRET').subscribe(res => {
      expect(res.id).toBe(10);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/10/items/20/statut`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ statut: 'PRET' });
    req.flush({ id: 10, statut: 'PRET' });
  });

  it('transitionBatch() sends a POST to /api/commandes/batch/transition', () => {
    const payload = { itemIds: [101, 102], cocktailId: 5, statut: 'EN_PREPARATION' };
    service.transitionBatch(payload).subscribe(res => {
      expect(res).toHaveSize(2);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/batch/transition`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush([{ id: 1, statut: 'EN_PREPARATION' }, { id: 2, statut: 'EN_PREPARATION' }]);
  });

  it('aggregateBatches() groups items by cocktail, aggregates quantities and tables, and scales ingredients', () => {
    const orders: any[] = [
      {
        id: 1,
        tableNom: 'Table 1',
        tableNumero: 1,
        statut: 'EN_ATTENTE',
        items: [
          {
            id: 10,
            cocktailId: 101,
            cocktailNom: 'Mojito',
            cocktailPhotoUrl: 'mojito.png',
            quantite: 3,
            prioritaire: false,
            station: 'BAR',
            ingredients: [
              { ingredientId: 1, quantite: 50, uniteMesure: 'ml', ingredientNom: 'Rhum' },
              { ingredientId: 2, quantite: 6, uniteMesure: 'feuilles', ingredientNom: 'Menthe' }
            ]
          }
        ],
        dateCommande: new Date(Date.now() - 5000),
        prioritaire: false
      },
      {
        id: 2,
        tableNom: 'Table 2',
        tableNumero: 2,
        statut: 'EN_ATTENTE',
        items: [
          {
            id: 20,
            cocktailId: 101,
            cocktailNom: 'Mojito',
            cocktailPhotoUrl: 'mojito.png',
            quantite: 2,
            prioritaire: true,
            notes: 'Sans glace',
            station: 'BAR',
            ingredients: [
              { ingredientId: 1, quantite: 50, uniteMesure: 'ml', ingredientNom: 'Rhum' },
              { ingredientId: 2, quantite: 6, uniteMesure: 'feuilles', ingredientNom: 'Menthe' }
            ]
          },
          {
            id: 21,
            cocktailId: 102,
            cocktailNom: 'Spritz',
            quantite: 1,
            prioritaire: false,
            station: 'BAR'
          }
        ],
        dateCommande: new Date(),
        prioritaire: true
      }
    ];

    const batches = service.aggregateBatches(orders, [], { stationFilter: 'BAR' });
    expect(batches).toHaveSize(2);

    const mojitoBatch = batches.find(b => b.cocktailNom === 'Mojito');
    expect(mojitoBatch).toBeDefined();
    expect(mojitoBatch?.totalQuantity).toBe(5);
    expect(mojitoBatch?.pendingQuantity).toBe(5);
    expect(mojitoBatch?.isUrgent).toBeTrue();
    expect(mojitoBatch?.items.map(it => it.itemId)).toEqual([10, 20]);
    expect(mojitoBatch?.tableSummaries).toEqual(['Table 1 (x3)', 'Table 2 (x2)']);

    // Check scaled ingredients: 5 Mojitos -> 5 * 50 = 250ml Rhum, 5 * 6 = 30 feuilles Menthe
    expect(mojitoBatch?.ingredients).toHaveSize(2);
    const rhum = mojitoBatch?.ingredients.find(i => i.ingredientNom === 'Rhum');
    expect(rhum?.totalQuantite).toBe(250);
    expect(rhum?.uniteMesure).toBe('ml');

    const menthe = mojitoBatch?.ingredients.find(i => i.ingredientNom === 'Menthe');
    expect(menthe?.totalQuantite).toBe(30);
  });

  it('getCommandesByStation() sends a GET to /api/commandes/station/{station}', () => {
    service.getCommandesByStation('KITCHEN').subscribe(data => {
      expect(data).toHaveSize(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/commandes/station/KITCHEN`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 11, statut: 'EN_ATTENTE' }]);
  });

  it('aggregateBatches() filters by station KITCHEN and handles preparing status and search term', () => {
    const orders: any[] = [
      {
        id: 10,
        tableNom: 'Table 5',
        tableNumero: 5,
        statut: 'EN_ATTENTE',
        dateCommande: new Date(Date.now() - 10000),
        items: [
          {
            id: 101,
            cocktailId: 201,
            cocktailNom: 'Tapas Mix',
            quantite: 2,
            statut: 'EN_PREPARATION',
            station: 'KITCHEN'
          },
          {
            id: 102,
            cocktailId: 202,
            cocktailNom: 'Frites',
            quantite: 1,
            statut: 'EN_ATTENTE',
            station: 'SNACK'
          },
          {
            id: 103,
            cocktailId: 101,
            cocktailNom: 'Mojito',
            quantite: 1,
            statut: 'LIVREE', // terminal status ignored
            station: 'BAR'
          }
        ]
      },
      {
        id: 11,
        tableNom: 'Table 6',
        tableNumero: 6,
        statut: 'EN_ATTENTE',
        dateCommande: new Date(Date.now() - 20000), // earlier date
        items: [
          {
            id: 104,
            cocktailId: 201,
            cocktailNom: 'Tapas Mix',
            quantite: 1,
            statut: 'EN_ATTENTE',
            station: 'KITCHEN'
          }
        ]
      }
    ];

    // Filter by KITCHEN (includes KITCHEN + SNACK)
    const kitchenBatches = service.aggregateBatches(orders, [], { stationFilter: 'KITCHEN' });
    expect(kitchenBatches).toHaveSize(2);

    const tapasBatch = kitchenBatches.find(b => b.cocktailNom === 'Tapas Mix');
    expect(tapasBatch).toBeDefined();
    expect(tapasBatch?.totalQuantity).toBe(3);
    expect(tapasBatch?.preparingQuantity).toBe(2);
    expect(tapasBatch?.pendingQuantity).toBe(1);

    // Search filter
    const searchBatches = service.aggregateBatches(orders, [], { searchTerm: 'frit' });
    expect(searchBatches).toHaveSize(1);
    expect(searchBatches[0].cocktailNom).toBe('Frites');
  });
});

