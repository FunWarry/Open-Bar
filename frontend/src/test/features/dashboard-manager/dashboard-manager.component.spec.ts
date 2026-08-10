import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { of, throwError, Subject } from 'rxjs';
import { IonicModule } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { DashboardManagerComponent } from '../../../app/features/dashboard-manager/dashboard-manager.component';
import { DashboardManagerService } from '../../../app/features/dashboard-manager/services/dashboard-manager.service';
import { DashboardStats, TopCocktail } from '../../../app/features/dashboard-manager/models/dashboard-stats.model';

const mockStats: DashboardStats = {
  commandesTotales: 20,
  commandesEnAttente: 3,
  commandesEnPreparation: 4,
  commandesPret: 2,
  commandesLivrees: 11,
  chiffreAffairesJour: 150.5,
  chiffreAffairesMois: 3200.0,
  tablesOccupees: 5,
  tablesTotales: 10,
  topCocktails: [
    { cocktailId: 1, nom: 'Mojito', nombreCommandes: 10 },
    { cocktailId: 2, nom: 'Margarita', nombreCommandes: 6 },
    { cocktailId: 3, nom: 'Cosmopolitan', nombreCommandes: 4 },
  ],
  stockIngredientsCritiques: 2,
};

describe('DashboardManagerComponent', () => {
  let component: DashboardManagerComponent;
  let fixture: ComponentFixture<DashboardManagerComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardManagerService>;

  beforeEach(async () => {
    dashboardServiceSpy = jasmine.createSpyObj<DashboardManagerService>('DashboardManagerService', ['getStats', 'getOngoingOrders']);
    dashboardServiceSpy.getStats.and.returnValue(of(mockStats));
    dashboardServiceSpy.getOngoingOrders.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DashboardManagerComponent, CommonModule, IonicModule.forRoot()],
      providers: [
        { provide: DashboardManagerService, useValue: dashboardServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() charge les stats via DashboardManagerService.getStats()', () => {
    expect(dashboardServiceSpy.getStats).toHaveBeenCalledTimes(1);
    expect(component.stats).toEqual(mockStats);
    expect(component.loading).toBeFalse();
  });

  it('chargerStats() met loading à true puis false après réponse', fakeAsync(() => {
    component.loading = false;
    dashboardServiceSpy.getStats.and.returnValue(of(mockStats));

    component.chargerStats();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.stats).toEqual(mockStats);
  }));

  it('chargerStats() met loading à false en cas d\'erreur', fakeAsync(() => {
    dashboardServiceSpy.getStats.and.returnValue(throwError(() => new Error('Erreur serveur')));

    component.chargerStats();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.stats).toBeNull();
  }));

  it('onRefresh() recharge les stats et appelle event.target.complete()', fakeAsync(() => {
    const eventMock = { target: { complete: jasmine.createSpy('complete') } };
    dashboardServiceSpy.getStats.and.returnValue(of(mockStats));

    component.onRefresh(eventMock);
    tick();

    expect(dashboardServiceSpy.getStats).toHaveBeenCalled();
    expect(component.stats).toEqual(mockStats);
    expect(eventMock.target.complete).toHaveBeenCalled();
  }));

  it('onRefresh() appelle event.target.complete() même en cas d\'erreur', fakeAsync(() => {
    const eventMock = { target: { complete: jasmine.createSpy('complete') } };
    dashboardServiceSpy.getStats.and.returnValue(throwError(() => new Error('Erreur')));

    component.onRefresh(eventMock);
    tick();

    expect(eventMock.target.complete).toHaveBeenCalled();
  }));

  it('formatCurrency() formate un nombre en euros (fr-FR)', () => {
    const result = component.formatCurrency(150.5);
    expect(result).toContain('150');
    expect(result).toContain('€');
  });

  it('formatCurrency() retourne 0 € pour une valeur nulle ou 0', () => {
    const result = component.formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('getRankLabel() retourne "1", "2", "3" selon l\'index', () => {
    expect(component.getRankLabel(0)).toBe('1');
    expect(component.getRankLabel(1)).toBe('2');
    expect(component.getRankLabel(2)).toBe('3');
  });

  it('getBarWidth() retourne 100 pour le cocktail le plus commandé', () => {
    component.stats = mockStats;
    const width = component.getBarWidth(mockStats.topCocktails[0]);
    expect(width).toBe(100);
  });

  it('getBarWidth() retourne un pourcentage relatif au max', () => {
    component.stats = mockStats;
    const width = component.getBarWidth(mockStats.topCocktails[1]);
    expect(width).toBe(60); // 6/10 * 100
  });

  it('getBarWidth() retourne 0 si stats est null', () => {
    component.stats = null;
    const cocktail: TopCocktail = { cocktailId: 1, nom: 'Mojito', nombreCommandes: 5 };
    expect(component.getBarWidth(cocktail)).toBe(0);
  });

  it('getBarWidth() retourne 0 si topCocktails est vide', () => {
    component.stats = { ...mockStats, topCocktails: [] };
    const cocktail: TopCocktail = { cocktailId: 1, nom: 'Mojito', nombreCommandes: 5 };
    expect(component.getBarWidth(cocktail)).toBe(0);
  });

  it('getBarWidth() retourne 0 si le max est 0', () => {
    component.stats = {
      ...mockStats,
      topCocktails: [{ cocktailId: 1, nom: 'Mojito', nombreCommandes: 0 }],
    };
    expect(component.getBarWidth({ cocktailId: 1, nom: 'Mojito', nombreCommandes: 0 })).toBe(0);
  });

  it('trackByCocktailId() retourne le cocktailId de l\'item', () => {
    const cocktail: TopCocktail = { cocktailId: 7, nom: 'Daiquiri', nombreCommandes: 3 };
    expect(component.trackByCocktailId(0, cocktail)).toBe(7);
  });

  it('polling automatique — recharge les stats toutes les 30s', fakeAsync(() => {
    // Le timer de beforeEach est hors zone fakeAsync — on crée un nouveau composant dans cette zone
    component.ngOnDestroy();
    (component as any).destroy$ = new Subject<void>();
    dashboardServiceSpy.getStats.calls.reset();

    component.ngOnInit();
    expect(dashboardServiceSpy.getStats).toHaveBeenCalledTimes(1);

    tick(DashboardManagerComponent.REFRESH_INTERVAL_MS);
    expect(dashboardServiceSpy.getStats).toHaveBeenCalledTimes(2);

    tick(DashboardManagerComponent.REFRESH_INTERVAL_MS);
    expect(dashboardServiceSpy.getStats).toHaveBeenCalledTimes(3);

    component.ngOnDestroy();
    tick(DashboardManagerComponent.REFRESH_INTERVAL_MS);
    expect(dashboardServiceSpy.getStats).toHaveBeenCalledTimes(3);
  }));

  it('ngOnDestroy() complète le subject destroy$ sans erreur', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
