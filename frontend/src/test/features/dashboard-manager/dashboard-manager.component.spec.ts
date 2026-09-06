import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { of, throwError, Subject, EMPTY } from 'rxjs';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { DashboardManagerComponent } from '../../../app/features/dashboard-manager/dashboard-manager.component';
import { DashboardManagerService } from '../../../app/features/dashboard-manager/services/dashboard-manager.service';
import { StockWasteService } from '../../../app/core/services/stock-waste.service';
import { DashboardStats, TopCocktail } from '../../../app/features/dashboard-manager/models/dashboard-stats.model';
import { NotificationService } from '../../../app/core/services/notification.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

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
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let notificationSubject$: Subject<any>;
  let stockAlertSubject$: Subject<any>;
  let stockWasteServiceSpy: jasmine.SpyObj<any>;
  let modalCtrlSpy: jasmine.SpyObj<any>;

  beforeEach(async () => {
    notificationSubject$ = new Subject<any>();
    stockAlertSubject$ = new Subject<any>();

    dashboardServiceSpy = jasmine.createSpyObj<DashboardManagerService>('DashboardManagerService', [
      'getStats',
      'getOngoingOrders',
      'exportStatsCsv'
    ]);
    dashboardServiceSpy.getStats.and.returnValue(of(mockStats));
    dashboardServiceSpy.getOngoingOrders.and.returnValue(of([]));

    notificationServiceSpy = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'onNotification',
      'onStockAlert'
    ]);
    notificationServiceSpy.onNotification.and.returnValue(notificationSubject$.asObservable());
    notificationServiceSpy.onStockAlert.and.returnValue(stockAlertSubject$.asObservable());

    stockWasteServiceSpy = jasmine.createSpyObj('StockWasteService', [
      'getWasteSummary',
      'getMovements',
      'recordWaste'
    ]);
    stockWasteServiceSpy.getWasteSummary.and.returnValue(of({
      totalMovements: 4,
      totalLossValue: 24.50,
      totalQuantityLost: 12,
      lossValueByReason: {
        CASSE: 14.50,
        PEREMPTION: 10.00,
        OFFERT_PATRON: 0,
        DEGUSTATION_STAFF: 0,
        ERREUR_PREPARATION: 0
      },
      countByReason: {
        CASSE: 2,
        PEREMPTION: 2,
        OFFERT_PATRON: 0,
        DEGUSTATION_STAFF: 0,
        ERREUR_PREPARATION: 0
      }
    }));
    stockWasteServiceSpy.getMovements.and.returnValue(of([
      {
        id: 1,
        ingredientId: 10,
        ingredientNom: 'Vodka',
        quantity: 2,
        unit: 'cl',
        reason: 'CASSE',
        reportedByUsername: 'barman1',
        cost: 4.00,
        recordedAt: '2026-09-06T15:00:00Z'
      }
    ]));

    const modalSpyObj = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'saved' }))
    };
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalSpyObj));

    const toastSpyObj = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastSpyObj.present.and.returnValue(Promise.resolve());
    toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpyObj));

    await TestBed.configureTestingModule({
      imports: [
        DashboardManagerComponent,
        CommonModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: DashboardManagerService, useValue: dashboardServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: StockWasteService, useValue: stockWasteServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        provideRouter([]),
      ],
    });

    TestBed.overrideComponent(DashboardManagerComponent, {
      set: {
        providers: []
      }
    });

    await TestBed.compileComponents();

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

  it('chargerStats() sets loading to true then false after response', fakeAsync(() => {
    component.loading = false;
    dashboardServiceSpy.getStats.and.returnValue(of(mockStats));

    component.chargerStats();
    tick();

    expect(component.loading).toBeFalse();
    expect(component.stats).toEqual(mockStats);
  }));

  it('chargerStats() sets loading to false on error', fakeAsync(() => {
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

  it('onRefresh() sans event ne plante pas', fakeAsync(() => {
    dashboardServiceSpy.getStats.and.returnValue(of(mockStats));
    expect(() => component.onRefresh()).not.toThrow();
    tick();
    expect(dashboardServiceSpy.getStats).toHaveBeenCalled();
  }));

  it('formatCurrency() formate un nombre en euros (fr-FR)', () => {
    const result = component.formatCurrency(150.5);
    expect(result).toContain('150');
    expect(result).toContain('€');
  });

  it('getRankLabel() returns medals and ordinal numbers', () => {
    expect(component.getRankLabel(0)).toBe('🥇');
    expect(component.getRankLabel(1)).toBe('🥈');
    expect(component.getRankLabel(2)).toBe('🥉');
    expect(component.getRankLabel(3)).toBe('#4');
  });

  it('getBarWidth() calcule le pourcentage relatif au cocktail le plus vendu', () => {
    component.stats = mockStats;
    expect(component.getBarWidth(mockStats.topCocktails[0])).toBe(100);
    expect(component.getBarWidth(mockStats.topCocktails[1])).toBe(60);
  });

  it('getBarWidth() retourne 0 if no stats or empty list', () => {
    component.stats = null;
    expect(component.getBarWidth({ cocktailId: 1, nom: 'Mojito', nombreCommandes: 5 })).toBe(0);

    component.stats = { ...mockStats, topCocktails: [] };
    expect(component.getBarWidth({ cocktailId: 1, nom: 'Mojito', nombreCommandes: 5 })).toBe(0);
  });

  it('calcule averageTicket, occupancyRate, activeOrdersCount, deliveryRate et totalCocktailsSold correctement', () => {
    component.stats = mockStats;
    // CA 150.5 / 20 = 7.525 -> 7.53
    expect(component.averageTicket).toBe(7.53);
    // 5 / 10 = 50%
    expect(component.occupancyRate).toBe(50);
    // 3 + 4 + 2 = 9
    expect(component.activeOrdersCount).toBe(9);
    // 11 / 20 = 55%
    expect(component.deliveryRate).toBe(55);
    // 10 + 6 + 4 = 20
    expect(component.totalCocktailsSold).toBe(20);
  });

  it('averageTicket, occupancyRate and deliveryRate return 0 if stats null or zero orders/tables', () => {
    component.stats = null;
    expect(component.averageTicket).toBe(0);
    expect(component.occupancyRate).toBe(0);
    expect(component.activeOrdersCount).toBe(0);
    expect(component.deliveryRate).toBe(0);
    expect(component.totalCocktailsSold).toBe(0);

    component.stats = { ...mockStats, commandesTotales: 0, tablesTotales: 0, topCocktails: [] };
    expect(component.averageTicket).toBe(0);
    expect(component.occupancyRate).toBe(0);
    expect(component.deliveryRate).toBe(0);
    expect(component.totalCocktailsSold).toBe(0);
  });

  it('onExportCsv() appelle dashboardService.exportStatsCsv et displays a toast', async () => {
    component.stats = mockStats;
    await component.onExportCsv();

    expect(dashboardServiceSpy.exportStatsCsv).toHaveBeenCalledWith(mockStats);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('WebSocket: updates stats silently on notification or stock event', () => {
    spyOn(component, 'chargerStatsSilent');
    spyOn(component, 'chargerOrdersSilent');

    notificationSubject$.next({ type: 'NOUVELLE_COMMANDE' });
    expect(component.chargerStatsSilent).toHaveBeenCalled();
    expect(component.chargerOrdersSilent).toHaveBeenCalled();

    stockAlertSubject$.next({ ingredientId: 1 });
    expect(component.chargerStatsSilent).toHaveBeenCalledTimes(2);
  });

  it('toggleShowDelivered() toggles visibility of delivered column', () => {
    expect(component.showDelivered).toBeFalse();
    component.toggleShowDelivered();
    expect(component.showDelivered).toBeTrue();
    component.toggleShowDelivered();
    expect(component.showDelivered).toBeFalse();
  });

  it('trackByCocktailId() retourne le cocktailId', () => {
    const cocktail: TopCocktail = { cocktailId: 42, nom: 'Gin Tonic', nombreCommandes: 5 };
    expect(component.trackByCocktailId(0, cocktail)).toBe(42);
  });

  it('renders top operational alert banners when stock or delays trigger alerts', () => {
    component.stats = {
      ...mockStats,
      commandesEnAttente: 6,
      stockIngredientsCritiques: 3,
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const pendingAlert = compiled.querySelector('[data-testid="alert-pending-orders"]');
    const stockAlert = compiled.querySelector('[data-testid="alert-critical-stock"]');

    expect(pendingAlert).toBeTruthy();
    expect(stockAlert).toBeTruthy();
  });

  it('renders quick action buttons with appropriate testids', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="manager-btn-schedule"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="manager-btn-employees"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="manager-btn-presets"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="manager-btn-timers"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="manager-btn-floor-plan"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="manager-btn-bar-stock"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="manager-btn-stock-waste"]')).toBeTruthy();
  });

  it('renders waste audit card with financial summary and movements', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="waste-audit-card"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="waste-stat-total-loss"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="waste-stat-total-qty"]')).toBeTruthy();
  });

  it('openWasteModal() opens StockWasteModalComponent and refreshes data on save', async () => {
    spyOn(component, 'chargerWasteSummary');
    await component.openWasteModal();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(component.chargerWasteSummary).toHaveBeenCalled();
  });

  it('calculates waste reason percentages and badge colors correctly', () => {
    expect(component.getWasteReasonPercent('CASSE')).toBeGreaterThan(0);
    expect(component.getWasteReasonBadgeColor('CASSE')).toBe('danger');
    expect(component.getWasteReasonBadgeColor('PEREMPTION')).toBe('warning');
    expect(component.getWasteReasonLabelKey('CASSE')).toBe('STOCK.WASTE_REASON_CASSE');
    expect(component.getReasonLossValue('CASSE')).toBe(14.50);
    expect(component.getReasonCount('CASSE')).toBe(2);
  });
});
