import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardManagerService } from '../../../../app/features/dashboard-manager/services/dashboard-manager.service';
import { DashboardStats } from '../../../../app/features/dashboard-manager/models/dashboard-stats.model';
import { environment } from '../../../../environments/environment';

describe('DashboardManagerService', () => {
  let service: DashboardManagerService;
  let httpMock: HttpTestingController;

  const mockStats: DashboardStats = {
    commandesTotales: 15,
    commandesEnAttente: 2,
    commandesEnPreparation: 3,
    commandesPret: 1,
    commandesLivrees: 9,
    chiffreAffairesJour: 240.0,
    chiffreAffairesMois: 4800.0,
    tablesOccupees: 4,
    tablesTotales: 12,
    topCocktails: [
      { cocktailId: 1, nom: 'Mojito', nombreCommandes: 8 }
    ],
    stockIngredientsCritiques: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardManagerService]
    });
    service = TestBed.inject(DashboardManagerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getStats() envoie un GET vers /api/dashboard/stats', () => {
    service.getStats().subscribe(stats => {
      expect(stats).toEqual(mockStats);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/dashboard/stats`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('getOngoingOrders() recupere et aggrege les commandes par statut', () => {
    service.getOngoingOrders().subscribe(orders => {
      expect(orders).toHaveSize(2);
      expect(orders[0].statut).toBe('EN_ATTENTE');
      expect(orders[1].statut).toBe('EN_PREPARATION');
    });

    const reqAttente = httpMock.expectOne(`${environment.apiUrl}/commandes/statut/EN_ATTENTE`);
    const reqPrep = httpMock.expectOne(`${environment.apiUrl}/commandes/statut/EN_PREPARATION`);
    const reqPret = httpMock.expectOne(`${environment.apiUrl}/commandes/statut/PRET`);
    const reqLivree = httpMock.expectOne(`${environment.apiUrl}/commandes/statut/LIVREE`);

    reqAttente.flush([{ id: 101, tableNumero: 4, dateCommande: '2026-08-15T12:00:00Z', serveurUsername: 'bob', items: [1, 2] }]);
    reqPrep.flush([{ id: 102, tableNumero: 5, dateCommande: '2026-08-15T12:10:00Z', serveurUsername: 'alice', items: [1] }]);
    reqPret.flush([]);
    reqLivree.flush([]);
  });

  it('exportStatsCsv() genere et declenche le telechargement du fichier CSV', () => {
    spyOn(document.body, 'appendChild').and.callThrough();

    service.exportStatsCsv(mockStats, new Date('2026-08-15'));
    expect(document.body.appendChild).toHaveBeenCalled();
  });
});
