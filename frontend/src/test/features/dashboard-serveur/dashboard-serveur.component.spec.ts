import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent,
  IonGrid, IonRow, IonCol,
  IonSegment, IonSegmentButton, IonLabel,
  IonButtons, IonButton, IonIcon,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { DashboardServeurComponent } from '../../../app/features/dashboard-serveur/dashboard-serveur.component';
import { DashboardServeurService } from '../../../app/features/dashboard-serveur/services/dashboard-serveur.service';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { TableCardComponent } from '../../../app/features/dashboard-serveur/components/table-card/table-card.component';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';
import { ZoneService } from '../../../app/core/services/zone.service';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { PlanSalleService } from '../../../app/features/plan-salle/services/plan-salle.service';
import { provideMockStore } from '@ngrx/store/testing';

import { provideIonicAngular } from '@ionic/angular/standalone';
import { Commande } from '../../../app/core/models/commande.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('DashboardServeurComponent', () => {
  let component: DashboardServeurComponent;
  let fixture: ComponentFixture<DashboardServeurComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardServeurService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let wsSpy: jasmine.SpyObj<WebSocketService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let planSalleServiceSpy: jasmine.SpyObj<PlanSalleService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let notification$: Subject<AppNotification>;

  const mockTables: TableView[] = [
    { id: 1, nom: 'Table 1', zone: 'Terrasse', capacite: 4, occupee: true, waitTimeMinutes: 15, dateOccupation: new Date(Date.now() - 15 * 60000).toISOString(), serveurNom: 'Alice', commandesActives: [] },
    { id: 2, nom: 'Table 2', zone: 'Salle', capacite: 2, occupee: false, waitTimeMinutes: 0, commandesActives: [] },
    { id: 3, nom: 'Table 3', zone: 'Bar', capacite: 6, occupee: true, waitTimeMinutes: 25, dateOccupation: new Date(Date.now() - 25 * 60000).toISOString(), commandesActives: [] },
  ];

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    notification$ = new Subject<AppNotification>();

    localStorage.clear();
    dashboardServiceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getAllTables',
      'getAllCommandes',
      'libererTable',
      'occuperTable',
      'getEtages',
      'getZones',
      'getPlanSallePositions',
      'createCommande',
      'ajouterItem',
    ]);
    dashboardServiceSpy.getAllTables.and.returnValue(of(mockTables));
    dashboardServiceSpy.getAllCommandes.and.returnValue(of([]));
    dashboardServiceSpy.libererTable.and.returnValue(of({} as any));
    dashboardServiceSpy.occuperTable.and.returnValue(of({} as any));
    dashboardServiceSpy.getEtages.and.returnValue(of([]));
    dashboardServiceSpy.getZones.and.returnValue(of([]));
    dashboardServiceSpy.getPlanSallePositions.and.returnValue(of([]));
    dashboardServiceSpy.createCommande.and.returnValue(of({ id: 10, tableId: 1 } as any));
    dashboardServiceSpy.ajouterItem.and.returnValue(of({ id: 10 } as any));

    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll']);
    zoneServiceSpy.getAll.and.returnValue(of([]));

    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', ['getAll']);
    cocktailServiceSpy.getAll.and.returnValue(of([]));

    planSalleServiceSpy = jasmine.createSpyObj('PlanSalleService', ['getPositions']);
    planSalleServiceSpy.getPositions.and.returnValue(of([]));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert']);
    notificationServiceSpy.onNotification.and.returnValue(notification$.asObservable());
    notificationServiceSpy.onStockAlert.and.returnValue(EMPTY);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    const mockModal = { present: jasmine.createSpy('present'), onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null })) };
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    wsSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsSpy.watch.and.returnValue(EMPTY);

    await TestBed.configureTestingModule({
      imports: [
        DashboardServeurComponent,
        CommonModule,
        RouterTestingModule,
        IonContent, IonHeader, IonToolbar, IonTitle,
        IonRefresher, IonRefresherContent,
        IonGrid, IonRow, IonCol,
        IonSegment, IonSegmentButton, IonLabel,
        IonButtons, IonButton, IonIcon,
        TableCardComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        provideMockStore({ initialState: { auth: { user: null } } }),
        { provide: DashboardServeurService, useValue: dashboardServiceSpy },
        { provide: ZoneService, useValue: zoneServiceSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: PlanSalleService, useValue: planSalleServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: WebSocketService, useValue: wsSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardServeurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit() loads tables on startup', () => {
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalled();
    expect(component.tables).toHaveSize(3);
  });

  it('ngOnInit() souscrit aux notifications WS', () => {
    expect(notificationServiceSpy.onNotification).toHaveBeenCalled();
  });

  // --- filtrer() ---

  it('filtrer() avec "ALL" retourne toutes les tables', () => {
    component.selectedStatus = 'ALL';
    component.filtrer();
    expect(component.filteredTables).toHaveSize(3);
  });

  it('filtrer() with "OCCUPIED" returns only occupied tables', () => {
    component.selectedStatus = 'OCCUPIED';
    component.filtrer();
    expect(component.filteredTables.every(t => t.occupee)).toBeTrue();
    expect(component.filteredTables).toHaveSize(2);
  });

  it('filtrer() avec "FREE" ne retourne que les tables libres', () => {
    component.selectedStatus = 'FREE';
    component.filtrer();
    expect(component.filteredTables.every(t => !t.occupee)).toBeTrue();
    expect(component.filteredTables).toHaveSize(1);
  });

  // --- countOccupees / countLibres ---

  it('countOccupees returns correct count of occupied tables', () => {
    expect(component.countOccupees).toBe(2);
  });

  it('countLibres retourne le bon nombre de tables libres', () => {
    expect(component.countLibres).toBe(1);
  });

  it('getWaitTimeMinutes() returns 0 for free table and > 0 for occupied table', () => {
    const libre = mockTables[1];
    const occupee = mockTables[0];

    expect(component.getWaitTimeMinutes(libre)).toBe(0);
    expect(component.getWaitTimeMinutes(occupee)).toBeGreaterThan(0);
  });

  // --- setStatusFilter() ---

  it('setStatusFilter() updates filter and triggers filtrer()', () => {
    component.setStatusFilter('OCCUPIED');
    expect(component.selectedStatus).toBe('OCCUPIED');
    expect(component.filteredTables).toHaveSize(2);
  });

  // --- chargerTables() ---

  it('chargerTables() sets isLoading to false after response', fakeAsync(() => {
    component.chargerTables();
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  it('chargerTables() calls complete() on refresh event if present', fakeAsync(() => {
    const target = { complete: jasmine.createSpy('complete') };
    const refreshEvent = { target };
    component.chargerTables(refreshEvent);
    tick();
    expect(target.complete).toHaveBeenCalled();
  }));

  it('chargerTables() displays error toast on failure', fakeAsync(() => {
    dashboardServiceSpy.getAllTables.and.returnValue(throwError(() => new Error('Network error')));
    component.chargerTables();
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  }));

  // --- onLiberer() ---

  it('onLiberer() appelle libererTable et recharge les tables', fakeAsync(() => {
    component.onLiberer(1);
    tick();
    // getAllTables called once at ngOnInit + once after liberer
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalledTimes(2);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));
  }));

  it('onLiberer() displays error toast if libererTable fails', fakeAsync(() => {
    dashboardServiceSpy.libererTable.and.returnValue(throwError(() => new Error('Forbidden')));
    component.onLiberer(99);
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  }));

  // --- Notification WS ---

  it('reloads tables on receiving "table" notification', fakeAsync(() => {
    const notif: AppNotification = {
      id: 'table-1',
      type: 'table',
      message: 'Table liberated',
      severity: 'success',
      timestamp: new Date(),
      lue: false
    };
    notification$.next(notif);
    tick();
    // 1 call at ngOnInit + 1 call triggered by notification
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalledTimes(2);
  }));

  it('reloads tables on receiving "commande" notification', fakeAsync(() => {
    const notif: AppNotification = {
      id: 'commande-1',
      type: 'commande',
      message: 'Nouvelle commande',
      severity: 'primary',
      timestamp: new Date(),
      lue: false
    };
    notification$.next(notif);
    tick();
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalledTimes(2);
  }));

  it('n\'recharge pas les tables pour une notification de type "stock"', fakeAsync(() => {
    const notif: AppNotification = {
      id: 'stock-1',
      type: 'stock',
      message: 'Stock faible',
      severity: 'warning',
      timestamp: new Date(),
      lue: false
    };
    notification$.next(notif);
    tick();
    // Seulement l'appel initial du ngOnInit
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalledTimes(1);
  }));

  // --- trackById ---

  it('trackById retourne l\'id de l\'item', () => {
    const item = { id: 42, nom: 'Test' };
    expect(component.trackById(0, item)).toBe(42);
  });

  // --- onSelectionner ---

  it('onSelectionner() ouvre un modal ModalController', fakeAsync(async () => {
    const table = mockTables[0];
    await component.onSelectionner(table);
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ componentProps: { table } }));
  }));

  // --- onRefresh ---

  it('onRefresh() delegates to chargerTables with event', fakeAsync(() => {
    const target = { complete: jasmine.createSpy('complete') };
    const event = { target };
    component.onRefresh(event);
    tick();
    expect(target.complete).toHaveBeenCalled();
  }));

  it('onEtageSelectChange() updates selectedEtage and filters tables', () => {
    const event = { target: { value: 'TERRASSE' } } as any;
    component.onEtageSelectChange(event);
    expect(component.selectedEtage).toBe('TERRASSE');
  });

  it('onZoneSelectChange() updates selectedZone and filters tables', () => {
    const event = { target: { value: 'Terrasse' } } as any;
    component.onZoneSelectChange(event);
    expect(component.selectedZone).toBe('Terrasse');
    expect(component.filteredTables.every(t => t.zone === 'Terrasse')).toBeTrue();
  });

  it('setDisplayMode() toggles between different display modes', () => {
    component.setDisplayMode('PLAN');
    expect(component.displayMode).toBe('PLAN');

    component.setDisplayMode('BY_ZONE');
    expect(component.displayMode).toBe('BY_ZONE');

    component.setDisplayMode('BY_FLOOR');
    expect(component.displayMode).toBe('BY_FLOOR');

    component.setDisplayMode('GRID');
    expect(component.displayMode).toBe('GRID');
  });

  it('sauvegarderFiltres() persiste la configuration des filtres dans localStorage', () => {
    component.setStatusFilter('OCCUPIED');
    component.setDisplayMode('GRID');
    const saved = localStorage.getItem('openbar_serveur_dashboard_filters');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.selectedStatus).toBe('OCCUPIED');
    expect(parsed.displayMode).toBe('GRID');
  });

  it('chargerFiltresSauvegardes() restaure la configuration depuis localStorage', () => {
    const config = {
      searchTerm: '',
      selectedStatus: 'FREE',
      selectedEtage: 'RDC',
      selectedZone: 'Salle Principale',
      sortOption: 'CAPACITY_DESC',
      displayMode: 'BY_FLOOR',
    };
    localStorage.setItem('openbar_serveur_dashboard_filters', JSON.stringify(config));

    component.ngOnInit();

    expect(component.selectedStatus).toBe('FREE');
    expect(component.selectedEtage).toBe('RDC');
    expect(component.selectedZone).toBe('Salle Principale');
    expect(component.sortOption).toBe('CAPACITY_DESC');
    expect(component.displayMode).toBe('BY_FLOOR');
  });

  it('toggleZone(), isZoneSelected() and clearZoneFilter() handle multi-zone selection', () => {
    expect(component.isZoneSelected('Terrasse')).toBeFalse();

    // Toggle Terrasse
    component.toggleZone('Terrasse');
    expect(component.isZoneSelected('Terrasse')).toBeTrue();
    expect(component.selectedZones).toEqual(['Terrasse']);
    expect(component.selectedZone).toBe('Terrasse');

    // Toggle Salle Principale (multi-selection)
    component.toggleZone('Salle Principale');
    expect(component.isZoneSelected('Salle Principale')).toBeTrue();
    expect(component.selectedZones).toEqual(['Terrasse', 'Salle Principale']);
    expect(component.selectedZone).toBe('MULTI');

    // Untoggle Terrasse
    component.toggleZone('Terrasse');
    expect(component.isZoneSelected('Terrasse')).toBeFalse();
    expect(component.selectedZones).toEqual(['Salle Principale']);

    // Clear all zones
    component.clearZoneFilter();
    expect(component.selectedZones).toEqual([]);
    expect(component.selectedZone).toBe('ALL');
  });

  // --- ngOnDestroy ---

  it('onSelectionner avec action encaisser ouvre le modal d\'encaissement', fakeAsync(() => {
    const table: TableView = { id: 1, nom: 'Table 1', zone: 'Terrasse', capacite: 4, occupee: true, commandesActives: [] };
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { action: 'encaisser', table } })),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    spyOn(component, 'ouvrirEncaissement').and.callThrough();

    component.onSelectionner(table);
    tick();

    expect(component.ouvrirEncaissement).toHaveBeenCalledWith(table);
  }));

  it('ouvrirEncaissement opens EncaissementModalComponent and reloads if settled', fakeAsync(() => {
    const table: TableView = { id: 1, nom: 'Table 1', zone: 'Terrasse', capacite: 4, occupee: true, commandesActives: [] };
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { action: 'settled' } })),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));
    spyOn(component, 'chargerTables').and.callThrough();

    component.ouvrirEncaissement(table);
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(component.chargerTables).toHaveBeenCalled();
  }));

  it('ngOnDestroy unsubs from observables', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  describe('Cart and Order Submission', () => {
    it('should select table for order and extract table number', () => {
      component.tables = mockTables;
      component.onTableSelectForOrder(1);
      expect(component.cart.tableId).toBe(1);
      expect(component.cart.tableNumero).toBe(1);
    });

    it('should add item to cart and increment quantity when added multiple times', () => {
      const product = { id: 10, nom: 'Mojito', prix: 8.5, categorie: 'COCKTAIL' };
      component.cart = { tableId: 1, items: [] };

      (component as any).pushItemToCart(product, undefined, 8.5);
      expect(component.cart.items).toHaveSize(1);
      expect(component.cart.items[0].quantite).toBe(1);

      (component as any).pushItemToCart(product, undefined, 8.5);
      expect(component.cart.items).toHaveSize(1);
      expect(component.cart.items[0].quantite).toBe(2);
    });

    it('should submit order to backend, display success toast, refresh tables, and clear cart', fakeAsync(() => {
      spyOn(component, 'chargerTables').and.callThrough();
      component.cart = {
        tableId: 1,
        tableNumero: 1,
        items: [
          { boissonId: 10, nom: 'Mojito', prix: 8.5, quantite: 2, commentaire: 'Sans sucre', exclusions: ['Gluten'] },
        ],
      };

      component.onSubmitCart();
      tick();

      expect(dashboardServiceSpy.createCommande).toHaveBeenCalledWith({ tableId: 1, notes: undefined });
      expect(dashboardServiceSpy.ajouterItem).toHaveBeenCalledWith(10, {
        cocktailId: 10,
        quantite: 2,
        prixUnitaire: 8.5,
        varianteId: undefined,
        notes: 'Sans sucre | Sans: Gluten',
      });
      expect(toastCtrlSpy.create).toHaveBeenCalled();
      expect(component.cart.items).toHaveSize(0);
      expect(component.cart.tableId).toBeNull();
      expect(component.chargerTables).toHaveBeenCalled();
      expect(component.isSubmitting).toBeFalse();
    }));

    it('should handle backend error on submitCart, show error toast, and keep cart items intact', fakeAsync(() => {
      dashboardServiceSpy.createCommande.and.returnValue(throwError(() => new Error('Server error')));
      component.cart = {
        tableId: 1,
        tableNumero: 1,
        items: [{ boissonId: 10, nom: 'Mojito', prix: 8.5, quantite: 1 }],
      };

      component.onSubmitCart();
      tick();

      expect(toastCtrlSpy.create).toHaveBeenCalled();
      expect(component.cart.items).toHaveSize(1);
      expect(component.isSubmitting).toBeFalse();
    }));

    it('should not submit cart when cart is empty or missing tableId or isSubmitting', () => {
      dashboardServiceSpy.createCommande.calls.reset();

      // Missing tableId
      component.cart = { tableId: null, items: [{ boissonId: 10, nom: 'Mojito', prix: 8.5, quantite: 1 }] };
      component.onSubmitCart();
      expect(dashboardServiceSpy.createCommande).not.toHaveBeenCalled();

      // Empty items
      component.cart = { tableId: 1, items: [] };
      component.onSubmitCart();
      expect(dashboardServiceSpy.createCommande).not.toHaveBeenCalled();

      // isSubmitting = true
      component.isSubmitting = true;
      component.cart = { tableId: 1, items: [{ boissonId: 10, nom: 'Mojito', prix: 8.5, quantite: 1 }] };
      component.onSubmitCart();
      expect(dashboardServiceSpy.createCommande).not.toHaveBeenCalled();
    });

    it('should clear cart on onClearCart', () => {
      component.cart = { tableId: 1, items: [{ boissonId: 10, nom: 'Mojito', prix: 8.5, quantite: 1 }] };
      component.onClearCart();
      expect(component.cart.items).toEqual([]);
      expect(component.cart.tableId).toBeNull();
    });

    it('should remove item from cart on onCartItemRemoved', () => {
      component.cart = {
        tableId: 1,
        items: [
          { boissonId: 10, nom: 'Mojito', prix: 8.5, quantite: 1 },
          { boissonId: 20, nom: 'Bière', prix: 5.0, quantite: 2 },
        ],
      };
      component.onCartItemRemoved(component.cart.items[0]);
      expect(component.cart.items).toHaveSize(1);
      expect(component.cart.items[0].boissonId).toBe(20);
    });

    it('should set table and change activeTab to commande on onNewOrderForTable', () => {
      const table: TableView = { id: 5, nom: 'Table 5', capacite: 4, occupee: true, zone: 'Terrasse', commandesActives: [] };
      component.onNewOrderForTable(table);
      expect(component.cart.tableId).toBe(5);
      expect(component.activeTab).toBe('commande');
    });

    it('should submit cart without item notes when item has no comments or exclusions', fakeAsync(() => {
      const mockCreated: Commande = {
        id: 12,
        tableId: 2,
        tableNumero: 2,
        serveurId: 1,
        serveurUsername: 'serveur',
        statut: 'EN_ATTENTE',
        items: [],
        total: 10.0,
        dateCommande: '2026-08-17T12:00:00Z',
        createdAt: '2026-08-17T12:00:00Z',
        updatedAt: '2026-08-17T12:00:00Z',
      };
      dashboardServiceSpy.createCommande.and.returnValue(of(mockCreated));
      dashboardServiceSpy.ajouterItem.and.returnValue(of(mockCreated));

      component.cart = {
        tableId: 2,
        tableNumero: 2,
        noteGenerale: 'Note table',
        items: [{ boissonId: 20, nom: 'Gin Tonic', prix: 10.0, quantite: 1 }],
      };

      component.onSubmitCart();
      tick();

      expect(dashboardServiceSpy.createCommande).toHaveBeenCalledWith({ tableId: 2, notes: 'Note table' });
      expect(dashboardServiceSpy.ajouterItem).toHaveBeenCalledWith(12, {
        cocktailId: 20,
        quantite: 1,
        prixUnitaire: 10.0,
        varianteId: undefined,
        notes: undefined,
      });
      expect(component.cart.items).toHaveSize(0);
    }));

    it('onSubmitCart presents a danger toast on error', fakeAsync(() => {
      component.cart = {
        tableId: 2,
        items: [{ boissonId: 20, nom: 'Gin Tonic', prix: 10.0, quantite: 1 }],
      };
      dashboardServiceSpy.createCommande.and.returnValue(throwError(() => new Error('Server error')));

      component.onSubmitCart();
      tick();

      expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
    }));

    it('onSelectionner triggers onLiberer when modal dismisses with action liberer', fakeAsync(() => {
      const mockModalDismiss = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        onWillDismiss: () => Promise.resolve({ data: { action: 'liberer', tableId: 2 } }),
      };
      modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModalDismiss as any));
      spyOn(component, 'onLiberer');

      component.onSelectionner(mockTables[0]);
      tick();

      expect(component.onLiberer).toHaveBeenCalledWith(2);
    }));

    it('onSelectionner triggers ouvrirEncaissement when modal dismisses with action encaisser', fakeAsync(() => {
      const mockModalDismiss = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        onWillDismiss: () => Promise.resolve({ data: { action: 'encaisser', table: mockTables[0] } }),
      };
      modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModalDismiss as any));
      spyOn(component, 'ouvrirEncaissement');

      component.onSelectionner(mockTables[0]);
      tick();

      expect(component.ouvrirEncaissement).toHaveBeenCalledWith(mockTables[0]);
    }));

    it('chargerTables shows toast on error', fakeAsync(() => {
      dashboardServiceSpy.getAllTables.and.returnValue(throwError(() => new Error('Failed')));
      component.chargerTables();
      tick();
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
    }));

    it('handles query parameters tab=commande and tableId correctly', fakeAsync(() => {
      const route = TestBed.inject(ActivatedRoute);
      (route as any).queryParams = of({ tab: 'commande', tableId: '1' });

      component.ngOnInit();
      tick();

      expect(component.activeTab).toBe('commande');
      expect(component.cart.tableId).toBe(1);
    }));

    it('handles query parameter tab=commande without tableId', fakeAsync(() => {
      const route = TestBed.inject(ActivatedRoute);
      (route as any).queryParams = of({ tab: 'commande' });

      component.ngOnInit();
      tick();

      expect(component.activeTab).toBe('commande');
    }));

    it('maps available and unavailable cocktails into stockStatus correctly', fakeAsync(() => {
      cocktailServiceSpy.getAll.and.returnValue(of([
        { id: 1, nom: 'Mojito', prix: 8, categorie: 'ALCOOLISE', disponible: true, ingredients: [] } as any,
        { id: 2, nom: 'Virgin', prix: 6, categorie: 'SANS_ALCOOL', disponible: false, ingredients: [] } as any,
      ]));

      component.chargerDonnees();
      tick();

      expect(component.products).toHaveSize(2);
      expect(component.products[0].stockStatus).toBe('NORMAL');
      expect(component.products[0].disponible).toBeTrue();
      expect(component.products[1].stockStatus).toBe('CRITIQUE');
      expect(component.products[1].disponible).toBeFalse();
    }));

    it('updates cart items immutably on cart quantity change and item removal', fakeAsync(() => {
      const initialItem = { boissonId: 1, nom: 'Mojito', prix: 8, quantite: 1, typeBoisson: 'ALCOOLISE' };
      component.cart = { tableId: 1, items: [initialItem] };

      component.onCartQuantityChanged({ item: initialItem, newQty: 3 });
      expect(component.cart.items[0].quantite).toBe(3);

      component.onCartItemRemoved(initialItem);
      expect(component.cart.items).toHaveSize(0);

      component.onTableSelectForOrder(2);
      expect(component.cart.tableId).toBe(2);
    }));

    it('filters tables by search term and floor', () => {
      component.searchTerm = 'Table 1';
      component.filtrer();
      expect(component.filteredTables).toHaveSize(1);
      expect(component.filteredTables[0].id).toBe(1);

      component.searchTerm = '';
      component.selectedEtage = 'RDC';
      component.filtrer();
      expect(component.filteredTables.length).toBeGreaterThan(0);
    });

    it('sorts tables according to all sort options', () => {
      component.sortOption = 'NUMBER_DESC';
      component.filtrer();
      expect(component.filteredTables[0].id).toBe(3);

      component.sortOption = 'CAPACITY_ASC';
      component.filtrer();
      expect(component.filteredTables[0].capacite).toBe(2);

      component.sortOption = 'CAPACITY_DESC';
      component.filtrer();
      expect(component.filteredTables[0].capacite).toBe(6);

      component.sortOption = 'STATUS_FREE';
      component.filtrer();
      expect(component.filteredTables[0].occupee).toBeFalse();

      component.sortOption = 'STATUS_OCCUPIED';
      component.filtrer();
      expect(component.filteredTables[0].occupee).toBeTrue();
    });

    it('saves and loads filter preferences in localStorage', () => {
      component.searchTerm = 'Terrasse';
      component.selectedStatus = 'FREE';
      component.filtrer();

      const saved = localStorage.getItem('openbar_serveur_dashboard_filters');
      expect(saved).toContain('Terrasse');
      expect(saved).toContain('FREE');
    });

    it('groupedTables getter groups tables by floor and by zone', () => {
      component.displayMode = 'BY_ZONE';
      const byZone = component.groupedTables;
      expect(byZone.length).toBeGreaterThan(0);
      expect(byZone[0].tables.length).toBeGreaterThan(0);

      component.displayMode = 'BY_FLOOR';
      const byFloor = component.groupedTables;
      expect(byFloor.length).toBeGreaterThan(0);
    });

    it('handles direct zone and floor toggling', () => {
      component.onEtageSelectChangeDirect('ETAGE_1');
      expect(component.selectedEtage).toBe('ETAGE_1');
      expect(component.selectedZone).toBe('ALL');

      component.onZoneSelectChangeDirect('Terrasse');
      expect(component.isZoneSelected('Terrasse')).toBeTrue();

      component.onZoneSelectChangeDirect('Terrasse');
      expect(component.isZoneSelected('Terrasse')).toBeFalse();

      component.onZoneSelectChangeDirect('ALL');
      expect(component.selectedZone).toBe('ALL');
    });

    it('buildPolygonPathData generates valid SVG path data', () => {
      const points = [0, 0, 100, 0, 100, 100, 0, 100];
      const path = component.buildPolygonPathData(points, [10, 10, 10, 10]);
      expect(path).toContain('M');
      expect(path).toContain('Z');

      const invalid = component.buildPolygonPathData([0, 0]);
      expect(invalid).toBe('');
    });

    it('filters products by category, query, and allergens', () => {
      component.products = [
        { id: 1, nom: 'Mojito', prix: 8.5, categorie: 'ALCOOLISE', stockStatus: 'NORMAL', disponible: true, description: 'Rhum menthe' },
        { id: 2, nom: 'Bière Blonde', prix: 5.0, categorie: 'BEER', stockStatus: 'NORMAL', disponible: true, description: 'Gluten orge' },
      ];

      component.productSearchQuery = 'Mojito';
      expect(component.filteredProducts).toHaveSize(1);

      component.productSearchQuery = '';
      component.selectedCategory = 'BEER';
      expect(component.filteredProducts).toHaveSize(1);

      component.selectedCategory = 'ALL';
      component.toggleAllergenFilter('GLUTEN');
      expect(component.selectedAllergens).toContain('GLUTEN');
      expect(component.filteredProducts).toHaveSize(1);
      expect(component.filteredProducts[0].nom).toBe('Mojito');

      component.clearAllergenFilters();
      expect(component.selectedAllergens).toHaveSize(0);
      expect(component.filteredProducts).toHaveSize(2);
    });

    it('returns proper category dot colors and styles', () => {
      expect(component.getCategoryDotColor('ALCOOLISE')).toBe('#10b981');
      expect(component.getCategoryDotColor('BEER')).toBe('#ffd900');
      expect(component.getCategoryDotColor('UNKNOWN')).toBe('#6366f1');

      const activeStyle = component.getCategoryPillStyle('ALCOOLISE', true);
      expect(activeStyle['background-color']).toBe('#10b981');
      expect(component.getCategoryPillStyle('ALCOOLISE', false)).toEqual({});
    });

    it('adds product directly to cart when no variants present', () => {
      const prod = { id: 10, nom: 'Gin Tonic', prix: 9.0, categorie: 'ALCOOLISE', stockStatus: 'NORMAL' as const, disponible: true };
      component.cart = { tableId: 1, items: [] };

      component.onAddToCart(prod);

      expect(component.cart.items).toHaveSize(1);
      expect(component.cart.items[0].nom).toBe('Gin Tonic');
      expect(component.cartTotalCount).toBe(1);
    });

    it('navigates tabs and liberates table properly', fakeAsync(() => {
      component.onTabSelected('suivi');
      expect(component.activeTab).toBe('suivi');

      component.naviguerKanban();
      expect(component.activeTab).toBe('suivi');

      dashboardServiceSpy.libererTable.and.returnValue(of(mockTables[0] as any));
      component.onLiberer(1);
      tick();

      expect(dashboardServiceSpy.libererTable).toHaveBeenCalledWith(1);
      expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
    }));

    it('computes table wait times and table colors correctly based on delays', () => {
      const t1: any = { id: 1, occupee: true, waitTimeMinutes: 25 };
      const colors25 = (component as any).getTableColors(t1, 25);
      expect(colors25.mainColor).toBe('#e5604f');

      const t2: any = { id: 2, occupee: true, waitTimeMinutes: 15 };
      const colors15 = (component as any).getTableColors(t2, 15);
      expect(colors15.mainColor).toBe('#f0a33b');

      const t3: any = { id: 3, occupee: true, waitTimeMinutes: 5 };
      const colors5 = (component as any).getTableColors(t3, 5);
      expect(colors5.mainColor).toBe('#2fbf6b');

      const tFree: any = { id: 4, occupee: false };
      const colorsFree = (component as any).getTableColors(tFree, 0);
      expect(colorsFree.mainColor).toBe('#2fbf6b');

      const tReserved: any = { id: 5, occupee: false, reservee: true };
      const colorsReserved = (component as any).getTableColors(tReserved, 0);
      expect(colorsReserved.mainColor).toBe('#9b8af2');

      const offsets1 = (component as any).calculateLabelOffsets(true, true);
      expect(offsets1.titleY).toBe(-22);

      const offsets2 = (component as any).calculateLabelOffsets(true, false);
      expect(offsets2.titleY).toBe(-14);

      const offsets3 = (component as any).calculateLabelOffsets(false, true);
      expect(offsets3.titleY).toBe(-14);

      const offsets4 = (component as any).calculateLabelOffsets(false, false);
      expect(offsets4.titleY).toBe(-8);

      const tOcc: any = { id: 6, occupee: true, dateOccupation: new Date(Date.now() - 15 * 60000).toISOString() };
      expect(component.getWaitTimeMinutes(tOcc)).toBeGreaterThanOrEqual(14);

      const tNoOcc: any = { id: 7, occupee: false };
      expect(component.getWaitTimeMinutes(tNoOcc)).toBe(0);
    });

    it('enriches tables with orders having order dates, items, and totals', () => {
      const tables: any[] = [{ id: 10, numero: 10, occupee: true, zone: 'TERRASSE' }];
      const orders: any[] = [
        {
          id: 101,
          tableId: 10,
          statut: 'EN_ATTENTE',
          dateCommande: new Date(Date.now() - 5 * 60000).toISOString(),
          total: 25.5,
          items: [{ id: 1, nom: 'Mojito' }, { id: 2, nom: 'Nachos' }]
        }
      ];

      const enriched = (component as any).enrichTablesWithOrders(tables, orders);
      expect(enriched[0].commandesActives).toHaveSize(1);
      expect(enriched[0].commandesActives[0].total).toBe(25.5);
      expect(enriched[0].commandesActives[0].itemCount).toBe(2);
      expect(enriched[0].waitTimeMinutes).toBeGreaterThanOrEqual(4);
    });

    it('computes table counts, searches, and tests all sort options', () => {
      expect(component.countOccupees).toBe(2);
      expect(component.countLibres).toBe(1);

      component.onSearchChange({ detail: { value: 'Table 1' } });
      expect(component.filteredTables.length).toBeGreaterThanOrEqual(1);

      component.setStatusFilter('FREE');
      expect(component.selectedStatus).toBe('FREE');
      expect(component.filteredTables.every(t => !t.occupee)).toBeTrue();

      component.setStatusFilter('OCCUPIED');
      expect(component.selectedStatus).toBe('OCCUPIED');
      expect(component.filteredTables.every(t => t.occupee)).toBeTrue();

      component.setStatusFilter('ALL');
      component.searchTerm = '';
      component.sortOption = 'NUMBER_DESC';
      component.filtrer();
      expect(component.filteredTables[0].id).toBeGreaterThanOrEqual(component.filteredTables[component.filteredTables.length - 1].id);

      component.sortOption = 'CAPACITY_ASC';
      component.filtrer();
      expect(component.filteredTables[0].capacite).toBeLessThanOrEqual(component.filteredTables[component.filteredTables.length - 1].capacite);

      component.sortOption = 'CAPACITY_DESC';
      component.filtrer();
      expect(component.filteredTables[0].capacite).toBeGreaterThanOrEqual(component.filteredTables[component.filteredTables.length - 1].capacite);

      component.sortOption = 'STATUS_OCCUPIED';
      component.filtrer();
      expect(component.filteredTables[0].occupee).toBeTrue();

      component.sortOption = 'STATUS_FREE';
      component.filtrer();
      expect(component.filteredTables[0].occupee).toBeFalse();
    });

    it('handles availableZonesForFilter and select changes', () => {
      component.selectedEtage = 'ALL';
      expect(component.availableZonesForFilter.length).toBeGreaterThanOrEqual(0);

      component.selectedEtage = 'ETAGE_1';
      expect(component.availableZonesForFilter.length).toBeGreaterThanOrEqual(0);

      component.onEtageSelectChange({ target: { value: 'RDC' } } as any);
      expect(component.selectedEtage).toBe('RDC');

      component.onZoneSelectChange({ target: { value: 'Terrasse' } } as any);
      expect(component.selectedZone).toBe('Terrasse');
    });

    it('returns SearchableOption arrays for etages, zones and sort and handles onOptionChange', () => {
      component.etagesList = [{ id: 1, code: 'RDC', nom: 'Rez-de-chaussée', ordre: 1 }];
      component.zonesList = [{ id: 1, nom: 'Terrasse', etage: 'RDC' }];

      expect(component.etageOptions).toHaveSize(2);
      expect(component.zoneOptions).toHaveSize(2);
      expect(component.sortOptions).toHaveSize(6);

      component.onEtageOptionChange({ value: 'RDC', label: 'Rez-de-chaussée' });
      expect(component.selectedEtage).toBe('RDC');

      component.onZoneOptionChange({ value: 'Terrasse', label: 'Terrasse' });
      expect(component.selectedZone).toBe('Terrasse');

      component.onSortOptionChange({ value: 'CAPACITY_DESC', label: 'Capacité décroissante' });
      expect(component.sortOption).toBe('CAPACITY_DESC');
    });

    it('updates product availability in-place upon /topic/cocktails WebSocket message', fakeAsync(() => {
      const cocktailWsTopic$ = new Subject<any>();
      wsSpy.watch.and.returnValue(cocktailWsTopic$.asObservable() as any);

      const localFixture = TestBed.createComponent(DashboardServeurComponent);
      const localComp = localFixture.componentInstance;
      localFixture.detectChanges();

      localComp.products = [
        { id: 10, nom: 'Mojito', prix: 8, categorie: 'ALCOOLISE', disponible: true, stockStatus: 'NORMAL' },
      ];

      cocktailWsTopic$.next({
        body: JSON.stringify({ id: 10, nom: 'Mojito Super', prix: 9, disponible: false }),
      });
      tick();

      expect(localComp.products[0].disponible).toBeFalse();
      expect(localComp.products[0].stockStatus).toBe('CRITIQUE');
      expect(localComp.products[0].nom).toBe('Mojito Super');
      expect(localComp.products[0].prix).toBe(9);

      localComp.ngOnDestroy();
    }));

    it('occupies table directly when onOccupyTable is called', fakeAsync(() => {
      const freeTable: TableView = { id: 2, nom: 'Table 2', zone: 'Salle', capacite: 2, occupee: false, commandesActives: [] };
      dashboardServiceSpy.occuperTable.and.returnValue(of({} as any));

      component.onOccupyTable(freeTable);
      tick();

      expect(dashboardServiceSpy.occuperTable).toHaveBeenCalledWith(2);
      expect(freeTable.occupee).toBeTrue();
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    }));

    it('frees table directly when onFreeTable is called', fakeAsync(() => {
      const occupiedTable: TableView = { id: 1, nom: 'Table 1', zone: 'Terrasse', capacite: 4, occupee: true, waitTimeMinutes: 15, commandesActives: [] };
      dashboardServiceSpy.libererTable.and.returnValue(of({} as any));

      component.onFreeTable(occupiedTable);
      tick();

      expect(dashboardServiceSpy.libererTable).toHaveBeenCalledWith(1);
      expect(occupiedTable.occupee).toBeFalse();
      expect(occupiedTable.waitTimeMinutes).toBe(0);
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    }));

    it('computes waitTimeMinutes from oldest pending order and ignores delivered orders', () => {
      const tables: TableView[] = [{ id: 11, nom: 'Table 11', zone: 'Terrasse', capacite: 4, occupee: true, commandesActives: [] }];
      const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();
      const twentyMinAgo = new Date(Date.now() - 20 * 60000).toISOString();

      // Table 11 has only a delivered order (LIVREE) -> wait time should be 0
      const deliveredOnly: Commande[] = [
        { id: 101, tableId: 11, statut: 'LIVREE', dateCommande: twentyMinAgo, total: 15 } as any,
      ];
      const enrichedDelivered = (component as any).enrichTablesWithOrders(tables, deliveredOnly);
      expect(enrichedDelivered[0].waitTimeMinutes).toBe(0);
      expect(enrichedDelivered[0].activeTotal).toBe(15);
      expect(enrichedDelivered[0].commandesActives).toHaveSize(1);

      // Table 11 has a delivered order (20 min ago) and a pending order (10 min ago) -> wait time should be 10 min
      const mixedOrders: Commande[] = [
        { id: 101, tableId: 11, statut: 'LIVREE', dateCommande: twentyMinAgo, total: 15 } as any,
        { id: 102, tableId: 11, statut: 'EN_ATTENTE', dateCommande: tenMinAgo, total: 20 } as any,
      ];
      const enrichedMixed = (component as any).enrichTablesWithOrders(tables, mixedOrders);
      expect(enrichedMixed[0].waitTimeMinutes).toBeGreaterThanOrEqual(9);
      expect(enrichedMixed[0].waitTimeMinutes).toBeLessThanOrEqual(11);
      expect(enrichedMixed[0].activeTotal).toBe(35);
      expect(enrichedMixed[0].commandesActives).toHaveSize(2);
    });
  });
});
