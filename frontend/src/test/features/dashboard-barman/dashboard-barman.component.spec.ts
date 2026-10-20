import { TestBed, ComponentFixture, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideIonicAngular } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { DashboardBarmanComponent } from '../../../app/features/dashboard-barman/dashboard-barman.component';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { CocktailBatchView } from '../../../app/features/dashboard-barman/models/batch-preparation.model';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { SoundService } from '../../../app/core/services/sound.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
import { CommandeService } from '../../../app/core/services/commande.service';
import { StockWasteService } from '../../../app/core/services/stock-waste.service';
import { StockMovement } from '../../../app/core/models/stock-waste.model';
import { QuickWasteLogModalComponent } from '../../../app/features/dashboard-barman/components/quick-waste-log-modal/quick-waste-log-modal.component';
import { RouletteService } from '../../../app/core/services/roulette.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('DashboardBarmanComponent', () => {
  let component: DashboardBarmanComponent;
  let fixture: ComponentFixture<DashboardBarmanComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let wsServiceSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let settingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let soundServiceSpy: jasmine.SpyObj<SoundService>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let stockWasteServiceSpy: jasmine.SpyObj<StockWasteService>;
  let notification$: Subject<AppNotification>;
  let wsTopic$: Subject<{ body: string }>;

  const mockCommandes: CommandeView[] = [
    {
      id: 1,
      tableNom: 'Table 1',
      tableNumero: 1,
      serveurNom: 'Alice',
      serveurUsername: 'alice',
      statut: 'EN_ATTENTE',
      items: [
        { id: 10, cocktailNom: 'Mojito', quantite: 2, prioritaire: false, notes: 'Sans sucre' }
      ],
      dateCommande: new Date(),
      prioritaire: false
    }
  ];

  const mockToast = { present: jasmine.createSpy('present') };
  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: null, role: 'cancel' }))
  };

  beforeEach(async () => {
    notification$ = new Subject<AppNotification>();

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', [
      'getCommandesEnAttente',
      'getCommandesEnPreparation',
      'getCommandesPret',
      'changerStatut',
      'getCocktails',
      'getCocktailById',
      'getIngredients',
      'toggleCocktailDisponibilite',
      'updateIngredientStock',
      'transitionBatch',
      'aggregateBatches',
      'isItemPrepared',
      'toggleItemPrepared',
      'clearPreparedItems'
    ]);
    dashboardServiceSpy.isItemPrepared.and.returnValue(false);
    dashboardServiceSpy.toggleItemPrepared.and.returnValue(true);
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of(mockCommandes));
    dashboardServiceSpy.getCommandesEnPreparation.and.returnValue(of([]));
    dashboardServiceSpy.getCommandesPret.and.returnValue(of([]));
    dashboardServiceSpy.changerStatut.and.returnValue(of(mockCommandes[0]));
    dashboardServiceSpy.transitionBatch.and.returnValue(of([]));
    dashboardServiceSpy.aggregateBatches.and.returnValue([]);
    dashboardServiceSpy.getCocktailById.and.returnValue(of({
      id: 101,
      nom: 'Mojito',
      prix: 8.5,
      categorie: 'ALCOOLISE',
      disponible: true,
      saisonnier: false,
      ingredients: [],
      variantes: [],
      instructions: 'Shaker bien',
      createdAt: '',
      updatedAt: ''
    }));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert']);
    notificationServiceSpy.onNotification.and.returnValue(notification$.asObservable());
    notificationServiceSpy.onStockAlert.and.returnValue(EMPTY);

    const mockAppSettings = {
      id: 1,
      primaryColor: '#6c7fe8',
      primaryColorStrong: '#5a68d6',
      logoUrl: null,
      establishmentName: 'OpenBar',
      defaultTheme: 'DARK' as const,
      tempsAlerteWarningMinutes: 3,
      tempsAlerteCommandeMinutes: 5,
      tempsAlerteCritiqueCommandeMinutes: 10,
      updatedAt: '',
    };

    settingsServiceSpy = jasmine.createSpyObj('AppSettingsService', ['getSettings']);
    settingsServiceSpy.getSettings.and.returnValue(of(mockAppSettings as any));
    (settingsServiceSpy as any).settings$ = of(mockAppSettings);

    soundServiceSpy = jasmine.createSpyObj('SoundService', [
      'isSoundEnabled',
      'setSoundEnabled',
      'toggleSound',
      'playNewOrderSound',
      'playOrderReadySound',
      'playUrgentAlertSound',
      'triggerUrgentOrderAlert',
      'clearUrgentOrder',
      'clearAllUrgentOrders',
    ]);
    soundServiceSpy.isSoundEnabled.and.returnValue(true);
    soundServiceSpy.toggleSound.and.returnValue(false);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    wsTopic$ = new Subject<{ body: string }>();
    wsServiceSpy = jasmine.createSpyObj('WebSocketService', ['watch']);
    wsServiceSpy.watch.and.returnValue(wsTopic$.asObservable() as any);

    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['toggleUrgent', 'setUrgent', 'changerStatut', 'getById']);
    commandeServiceSpy.toggleUrgent.and.returnValue(of({ id: 1, prioritaire: true } as any));
    commandeServiceSpy.setUrgent.and.returnValue(of({ id: 1, prioritaire: true } as any));

    stockWasteServiceSpy = jasmine.createSpyObj('StockWasteService', ['quickLog', 'revertQuickLog']);
    stockWasteServiceSpy.revertQuickLog.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [
        DashboardBarmanComponent,
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        provideIonicAngular(),
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AppSettingsService, useValue: settingsServiceSpy },
        { provide: SoundService, useValue: soundServiceSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: StockWasteService, useValue: stockWasteServiceSpy },
        {
          provide: RouletteService,
          useValue: {
            getDisplayPin: () => of({ pin: '7777' }),
            watchEvents: () => EMPTY
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardBarmanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('chargerCommandes() peuple les trois colonnes du kanban', fakeAsync(() => {
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of(mockCommandes));
    dashboardServiceSpy.getCommandesEnPreparation.and.returnValue(
      of([{ ...mockCommandes[0], id: 2, statut: 'EN_PREPARATION' as const }])
    );
    dashboardServiceSpy.getCommandesPret.and.returnValue(
      of([{ ...mockCommandes[0], id: 3, statut: 'PRET' as const }])
    );

    component.chargerCommandes();
    tick();

    expect(component.commandesEnAttente).toHaveSize(1);
    expect(component.commandesEnPreparation).toHaveSize(1);
    expect(component.commandesPret).toHaveSize(1);
  }));

  it('chargerCommandes() triggers sound if new orders are detected', fakeAsync(() => {
    component.commandesEnAttente = [mockCommandes[0]];
    const newCommandes = [
      mockCommandes[0],
      { ...mockCommandes[0], id: 99 }
    ];
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of(newCommandes));

    component.chargerCommandes();
    tick();

    expect(soundServiceSpy.playNewOrderSound).toHaveBeenCalled();
  }));

  it('chargerCommandes() displays a toast danger en cas d erreur', fakeAsync(() => {
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(throwError(() => new Error('Network error')));

    component.chargerCommandes();
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onChangerStatut() appelle changerStatut(), joue un son pour PRET et recharge les commandes', fakeAsync(() => {
    component.onChangerStatut({ id: 1, statut: 'PRET' });
    tick();
    flushMicrotasks();

    expect(dashboardServiceSpy.changerStatut).toHaveBeenCalledWith(1, 'PRET');
    expect(soundServiceSpy.playOrderReadySound).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onChangerStatut() displays a toast danger en cas d erreur', fakeAsync(() => {
    dashboardServiceSpy.changerStatut.and.returnValue(throwError(() => new Error('API error')));

    component.onChangerStatut({ id: 1, statut: 'PRET' });
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('toggleSound() toggles audio state and displays toast', () => {
    component.toggleSound();
    expect(soundServiceSpy.toggleSound).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('openRupturesModal() ouvre la modale des ruptures de stock', async () => {
    await component.openRupturesModal();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
  });

  it('onPrintTicket() opens 80mm thermal print modal with station context', async () => {
    await component.onPrintTicket(mockCommandes[0]);
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: {
        commande: mockCommandes[0],
        isKitchenMode: false,
        stationFilter: 'ALL'
      }
    }));
    expect(mockModal.present).toHaveBeenCalled();
  });

  it('onPrintTicket() in kitchen mode passes isKitchenMode and KITCHEN stationFilter', async () => {
    component.isKitchenModeInput = true;
    component.stationFilter = 'KITCHEN';
    await component.onPrintTicket(mockCommandes[0]);
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: {
        commande: mockCommandes[0],
        isKitchenMode: true,
        stationFilter: 'KITCHEN'
      }
    }));
  });

  it('onShowRecipe() opens side panel and loads cocktail details', () => {
    const item = { id: 1, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false };
    dashboardServiceSpy.getCocktailById.and.returnValue(of({
      id: 101,
      nom: 'Mojito',
      prix: 8.5,
      categorie: 'ALCOOLISE',
      disponible: true,
      saisonnier: false,
      ingredients: [],
      variantes: [],
      instructions: 'Shaker bien',
      createdAt: '',
      updatedAt: ''
    }));

    component.onShowRecipe({ item, commande: mockCommandes[0] });

    expect(component.isRecipePanelOpen).toBeTrue();
    expect(component.activeRecipeItem).toBe(item);
    expect(component.activeRecipeOrder).toBe(mockCommandes[0]);
    expect(dashboardServiceSpy.getCocktailById).toHaveBeenCalledWith(101);
    expect(component.activeRecipeCocktail?.nom).toBe('Mojito');

    // Second call uses cache
    dashboardServiceSpy.getCocktailById.calls.reset();
    component.onShowRecipe({ item, commande: mockCommandes[0] });
    expect(dashboardServiceSpy.getCocktailById).not.toHaveBeenCalled();

    // Closing panel
    component.onCloseRecipePanel();
    expect(component.isRecipePanelOpen).toBeFalse();
  });

  it('filtrage par recherche fonctionne correctement', () => {
    component.commandesEnAttente = [
      { ...mockCommandes[0], id: 1, tableNom: 'Table 1', items: [{ id: 1, cocktailNom: 'Mojito', quantite: 1, prioritaire: false }] },
      { ...mockCommandes[0], id: 2, tableNom: 'Table 2', items: [{ id: 2, cocktailNom: 'Daiquiri', quantite: 1, prioritaire: false }] }
    ];

    component.searchQuery = 'mojito';
    expect(component.filteredCommandesEnAttente).toHaveSize(1);
    expect(component.filteredCommandesEnAttente[0].id).toBe(1);

    component.searchQuery = 'Table 2';
    expect(component.filteredCommandesEnAttente).toHaveSize(1);
    expect(component.filteredCommandesEnAttente[0].id).toBe(2);
  });

  it('filtrage urgentOnly filtre les commandes normales', () => {
    const freshDate = new Date();
    const oldDate = new Date(Date.now() - 10 * 60 * 1000);

    component.commandesEnAttente = [
      { ...mockCommandes[0], id: 1, dateCommande: freshDate, prioritaire: false },
      { ...mockCommandes[0], id: 2, dateCommande: oldDate, prioritaire: false }
    ];

    component.urgentOnly = true;
    expect(component.filteredCommandesEnAttente).toHaveSize(1);
    expect(component.filteredCommandesEnAttente[0].id).toBe(2);
  });

  it('onRefresh() appelle chargerCommandes() et complete l event apres 500ms', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const mockEvent = { target: { complete: completeSpy } };

    component.onRefresh(mockEvent);
    tick(500);

    expect(completeSpy).toHaveBeenCalled();
  }));

  it('recharge les commandes et joue un son sur notification WS commande', fakeAsync(() => {
    notification$.next({
      id: 'cmd-1',
      type: 'commande',
      message: 'Nouvelle commande',
      severity: 'primary',
      timestamp: new Date(),
      lue: false
    });
    tick();

    expect(soundServiceSpy.playNewOrderSound).toHaveBeenCalled();
  }));

  it('supprime immediatement la commande annulee ou reglee lors d un message WS /topic/barman/commandes', fakeAsync(() => {
    component.commandesEnAttente = [{ ...mockCommandes[0], id: 10 }];
    component.commandesEnPreparation = [{ ...mockCommandes[0], id: 20 }];
    component.commandesPret = [{ ...mockCommandes[0], id: 30 }];

    wsTopic$.next({ body: JSON.stringify({ id: 10, statut: 'ANNULEE' }) });
    tick();

    expect(component.commandesEnAttente).toHaveSize(0);
    expect(component.commandesEnPreparation).toHaveSize(1);
    expect(component.commandesPret).toHaveSize(1);

    wsTopic$.next({ body: JSON.stringify({ id: 20, statut: 'REGLEE' }) });
    tick();

    expect(component.commandesEnPreparation).toHaveSize(0);

    wsTopic$.next({ body: JSON.stringify({ id: 30, statut: 'LIVREE' }) });
    tick();

    expect(component.commandesPret).toHaveSize(0);
  }));

  it('recharge les commandes lors d un message WS de mise a jour standard ou malforme', fakeAsync(() => {
    spyOn(component, 'chargerCommandes');

    wsTopic$.next({ body: JSON.stringify({ id: 40, statut: 'EN_PREPARATION' }) });
    tick();
    expect(component.chargerCommandes).toHaveBeenCalledTimes(1);

    wsTopic$.next({ body: 'malformed json' });
    tick();
    expect(component.chargerCommandes).toHaveBeenCalledTimes(2);
  }));

  it('filters cancelled orders in memory on notification of type commande or statut', fakeAsync(() => {
    component.commandesEnAttente = [{ ...mockCommandes[0], id: 50 }];
    component.commandesEnPreparation = [{ ...mockCommandes[0], id: 51 }];
    component.commandesPret = [{ ...mockCommandes[0], id: 52 }];

    notification$.next({
      id: 'cmd-cancel',
      type: 'commande',
      message: 'Cancelled',
      severity: 'primary',
      data: { id: 50, statut: 'ANNULEE' },
      timestamp: new Date(),
      lue: false,
    });
    tick();
    expect(component.commandesEnAttente).toHaveSize(0);

    notification$.next({
      id: 'statut-reglee',
      type: 'statut',
      message: 'Settled',
      severity: 'success',
      data: { id: 51, statut: 'REGLEE' },
      timestamp: new Date(),
      lue: false,
    });
    tick();
    expect(component.commandesEnPreparation).toHaveSize(0);

    notification$.next({
      id: 'statut-livree',
      type: 'statut',
      message: 'Delivered',
      severity: 'success',
      data: { id: 52, statut: 'LIVREE' },
      timestamp: new Date(),
      lue: false,
    });
    tick();
    expect(component.commandesPret).toHaveSize(0);
  }));

  it('reloads orders on notification of type statut without terminal status', fakeAsync(() => {
    spyOn(component, 'chargerCommandes');

    notification$.next({
      id: 'statut-prep',
      type: 'statut',
      message: 'In prep',
      severity: 'success',
      data: { id: 60, statut: 'EN_PREPARATION' },
      timestamp: new Date(),
      lue: false,
    });
    tick();
    expect(component.chargerCommandes).toHaveBeenCalled();
  }));

  it('should filter orders by workstation station (ALL, BAR, KITCHEN)', () => {
    const cmdBar: CommandeView = {
      ...mockCommandes[0],
      id: 11,
      items: [{ id: 1, cocktailNom: 'Mojito', quantite: 1, prioritaire: false, station: 'BAR' }]
    };
    const cmdKitchen: CommandeView = {
      ...mockCommandes[0],
      id: 12,
      items: [{ id: 2, cocktailNom: 'Planche', quantite: 1, prioritaire: false, station: 'KITCHEN' }]
    };

    component.commandesEnAttente = [cmdBar, cmdKitchen];

    component.setStationFilter('ALL');
    expect(component.filteredCommandesEnAttente).toHaveSize(2);

    component.setStationFilter('BAR');
    expect(component.filteredCommandesEnAttente).toHaveSize(1);
    expect(component.filteredCommandesEnAttente[0].id).toBe(11);

    component.setStationFilter('KITCHEN');
    expect(component.filteredCommandesEnAttente).toHaveSize(1);
    expect(component.filteredCommandesEnAttente[0].id).toBe(12);
  });

  it('activeViewMode defaults to tickets and can be toggled to batch', () => {
    expect(component.activeViewMode).toBe('tickets');
    component.activeViewMode = 'batch';
    expect(component.activeViewMode).toBe('batch');
  });

  it('pendingBatches and inProgressBatches delegate aggregation to dashboardService', () => {
    const dummyBatch: CocktailBatchView = {
      cocktailId: 101,
      cocktailNom: 'Mojito',
      totalQuantity: 4,
      pendingQuantity: 4,
      preparingQuantity: 0,
      isUrgent: false,
      earliestOrderDate: new Date(),
      tableSummaries: ['Table 1 (x2)', 'Table 2 (x2)'],
      items: [
        { commandeId: 1, tableNom: 'Table 1', itemId: 10, quantite: 2, prioritaire: false },
        { commandeId: 2, tableNom: 'Table 2', itemId: 20, quantite: 2, prioritaire: false }
      ],
      ingredients: [],
      sampleItem: { id: 10, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
      sampleCommande: mockCommandes[0]
    };

    dashboardServiceSpy.aggregateBatches.and.returnValue([dummyBatch]);

    expect(component.pendingBatches).toEqual([dummyBatch]);
    expect(dashboardServiceSpy.aggregateBatches).toHaveBeenCalledWith(
      component.commandesEnAttente,
      component.commandesEnPreparation,
      jasmine.objectContaining({ stationFilter: component.stationFilter })
    );

    expect(component.inProgressBatches).toEqual([]);
  });

  it('onStartBatch() transitions items to EN_PREPARATION, plays sound and reloads orders', fakeAsync(() => {
    const dummyBatch: CocktailBatchView = {
      cocktailId: 101,
      cocktailNom: 'Mojito',
      totalQuantity: 4,
      pendingQuantity: 4,
      preparingQuantity: 0,
      isUrgent: false,
      earliestOrderDate: new Date(),
      tableSummaries: ['Table 1 (x2)', 'Table 2 (x2)'],
      items: [
        { commandeId: 1, tableNom: 'Table 1', itemId: 10, quantite: 2, prioritaire: false },
        { commandeId: 2, tableNom: 'Table 2', itemId: 20, quantite: 2, prioritaire: false }
      ],
      ingredients: [],
      sampleItem: { id: 10, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
      sampleCommande: mockCommandes[0]
    };

    spyOn(component, 'chargerCommandes');
    dashboardServiceSpy.transitionBatch.and.returnValue(of(mockCommandes));

    component.onStartBatch(dummyBatch);
    tick();
    flushMicrotasks();

    expect(dashboardServiceSpy.transitionBatch).toHaveBeenCalledWith({
      itemIds: [10, 20],
      statut: 'EN_PREPARATION'
    });
    expect(component.chargerCommandes).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'primary' }));
  }));

  it('onCompleteBatch() transitions items to PRET, plays order ready sound and reloads orders', fakeAsync(() => {
    const dummyBatch: CocktailBatchView = {
      cocktailId: 101,
      cocktailNom: 'Mojito',
      totalQuantity: 4,
      pendingQuantity: 0,
      preparingQuantity: 4,
      isUrgent: false,
      earliestOrderDate: new Date(),
      tableSummaries: ['Table 1 (x2)', 'Table 2 (x2)'],
      items: [
        { commandeId: 1, tableNom: 'Table 1', itemId: 10, quantite: 2, prioritaire: false },
        { commandeId: 2, tableNom: 'Table 2', itemId: 20, quantite: 2, prioritaire: false }
      ],
      ingredients: [],
      sampleItem: { id: 10, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
      sampleCommande: mockCommandes[0]
    };

    spyOn(component, 'chargerCommandes');
    dashboardServiceSpy.transitionBatch.and.returnValue(of(mockCommandes));

    component.onCompleteBatch(dummyBatch);
    tick();
    flushMicrotasks();

    expect(dashboardServiceSpy.transitionBatch).toHaveBeenCalledWith({
      itemIds: [10, 20],
      statut: 'PRET'
    });
    expect(soundServiceSpy.playOrderReadySound).toHaveBeenCalled();
    expect(component.chargerCommandes).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onOpenBatchRecipe() opens recipe side panel with scaled batch quantity', () => {
    const dummyBatch: CocktailBatchView = {
      cocktailId: 101,
      cocktailNom: 'Mojito',
      totalQuantity: 6,
      pendingQuantity: 6,
      preparingQuantity: 0,
      isUrgent: false,
      earliestOrderDate: new Date(),
      tableSummaries: ['Table 1 (x6)'],
      items: [
        { commandeId: 1, tableNom: 'Table 1', itemId: 10, quantite: 6, prioritaire: false }
      ],
      ingredients: [],
      sampleItem: { id: 10, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
      sampleCommande: mockCommandes[0]
    };

    spyOn(component, 'onShowRecipe');
    component.onOpenBatchRecipe(dummyBatch);

    expect(component.onShowRecipe).toHaveBeenCalledWith({
      item: jasmine.objectContaining({
        quantite: 6,
        cocktailNom: 'Mojito'
      }),
      commande: dummyBatch.sampleCommande
    });
  });

  it('distinctBatchRecipesCount and urgentBatchesCount return correct counts', () => {
    const dummyBatches: CocktailBatchView[] = [
      {
        cocktailId: 101,
        cocktailNom: 'Mojito',
        totalQuantity: 3,
        pendingQuantity: 3,
        preparingQuantity: 0,
        isUrgent: true,
        earliestOrderDate: new Date(),
        tableSummaries: [],
        items: [],
        ingredients: [],
        sampleItem: { id: 1, cocktailId: 101, cocktailNom: 'Mojito', quantite: 3, prioritaire: true },
        sampleCommande: mockCommandes[0]
      },
      {
        cocktailId: 102,
        cocktailNom: 'Spritz',
        totalQuantity: 2,
        pendingQuantity: 2,
        preparingQuantity: 0,
        isUrgent: false,
        earliestOrderDate: new Date(),
        tableSummaries: [],
        items: [],
        ingredients: [],
        sampleItem: { id: 2, cocktailId: 102, cocktailNom: 'Spritz', quantite: 2, prioritaire: false },
        sampleCommande: mockCommandes[0]
      }
    ];
    dashboardServiceSpy.aggregateBatches.and.returnValue(dummyBatches);

    expect(component.distinctBatchRecipesCount).toBe(2);
    expect(component.urgentBatchesCount).toBe(1);
    expect(component.totalBatchDrinksCount).toBe(5);
    expect(component.trackByBatchCocktail(0, dummyBatches[0])).toBe('Mojito');
  });

  it('onStartBatch() returns early if batch items are empty and shows danger toast on error', fakeAsync(() => {
    const dummyBatch: CocktailBatchView = {
      cocktailId: 101,
      cocktailNom: 'Mojito',
      totalQuantity: 2,
      pendingQuantity: 2,
      preparingQuantity: 0,
      isUrgent: false,
      earliestOrderDate: new Date(),
      tableSummaries: [],
      items: [],
      ingredients: [],
      sampleItem: { id: 1, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
      sampleCommande: mockCommandes[0]
    };

    component.onStartBatch(dummyBatch);
    expect(dashboardServiceSpy.transitionBatch).not.toHaveBeenCalled();

    const batchWithError: CocktailBatchView = {
      ...dummyBatch,
      items: [{ commandeId: 1, tableNom: 'T1', itemId: 99, quantite: 1, prioritaire: false, statut: 'EN_ATTENTE' }]
    };

    dashboardServiceSpy.transitionBatch.and.returnValue(throwError(() => new Error('Server error')));
    component.onStartBatch(batchWithError);
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onCompleteBatch() returns early if batch items are empty and shows danger toast on error', fakeAsync(() => {
    const dummyBatch: CocktailBatchView = {
      cocktailId: 101,
      cocktailNom: 'Mojito',
      totalQuantity: 2,
      pendingQuantity: 0,
      preparingQuantity: 2,
      isUrgent: false,
      earliestOrderDate: new Date(),
      tableSummaries: [],
      items: [],
      ingredients: [],
      sampleItem: { id: 1, cocktailId: 101, cocktailNom: 'Mojito', quantite: 2, prioritaire: false },
      sampleCommande: mockCommandes[0]
    };

    component.onCompleteBatch(dummyBatch);
    expect(dashboardServiceSpy.transitionBatch).not.toHaveBeenCalled();

    const batchWithError: CocktailBatchView = {
      ...dummyBatch,
      items: [{ commandeId: 1, tableNom: 'T1', itemId: 99, quantite: 1, prioritaire: false, statut: 'EN_PREPARATION' }]
    };

    dashboardServiceSpy.transitionBatch.and.returnValue(throwError(() => new Error('Server error')));
    component.onCompleteBatch(batchWithError);
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  describe('Header Toolbar & Segment Layout Non-Regression (#420)', () => {
    it('should render segment buttons with layout icon-start and proper test attributes', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const ticketsBtn = compiled.querySelector('ion-segment-button[data-testid="segment-view-tickets"]');
      const batchBtn = compiled.querySelector('ion-segment-button[data-testid="segment-view-batch"]');

      expect(ticketsBtn).toBeTruthy();
      expect(ticketsBtn?.getAttribute('layout')).toBe('icon-start');
      expect(batchBtn).toBeTruthy();
      expect(batchBtn?.getAttribute('layout')).toBe('icon-start');
    });

    it('should provide ion-refresher for pull-to-refresh reloading without redundant toolbar button', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const refresher = compiled.querySelector('ion-refresher');
      expect(refresher).toBeTruthy();
      const refreshBtn = compiled.querySelector('ion-button[data-testid="refresh-orders-btn"]');
      expect(refreshBtn).toBeNull();
    });

    it('should render batch badge inside batch-segment-label when batch drinks exist', () => {
      spyOnProperty(component, 'totalBatchDrinksCount', 'get').and.returnValue(5);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('[data-testid="batch-count-badge"]');
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains('segment-badge')).toBeTrue();
      expect(badge?.textContent?.trim()).toBe('5');
    });

    it('should display critical stock banner when stock alert drops to zero', () => {
      component.activeCriticalStockAlert = {
        ingredientId: 5,
        nom: 'Fresh Mint',
        uniteMesure: 'g',
        quantiteStock: 0
      };
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const banner = compiled.querySelector('[data-testid="critical-stock-banner"]');
      expect(banner).toBeTruthy();
      expect(banner?.textContent).toContain('Fresh Mint');
    });

    it('should dismiss critical stock alert on dismissCriticalStockAlert call', () => {
      component.activeCriticalStockAlert = {
        ingredientId: 5,
        nom: 'Fresh Mint',
        uniteMesure: 'g',
        quantiteStock: 0
      };
      component.dismissCriticalStockAlert();
      expect(component.activeCriticalStockAlert).toBeNull();
    });

    it('should open RuptureImpactModalComponent when clicking verify on critical stock alert', async () => {
      component.activeCriticalStockAlert = {
        ingredientId: 5,
        nom: 'Fresh Mint',
        uniteMesure: 'g',
        quantiteStock: 0
      };
      await component.openCriticalStockImpactModal();
      expect(modalCtrlSpy.create).toHaveBeenCalled();
      expect(component.activeCriticalStockAlert).toBeNull();
    });

    it('should do nothing in openCriticalStockImpactModal when activeCriticalStockAlert is null', async () => {
      component.activeCriticalStockAlert = null;
      await component.openCriticalStockImpactModal();
      expect(modalCtrlSpy.create).not.toHaveBeenCalled();
    });
  });

  describe('filtrerCommandes with bar tabs and search queries', () => {
    it('matches bar tab names and formatted table strings', () => {
      const cmds: CommandeView[] = [
        {
          id: 1,
          tableNumero: 5,
          barTabNom: 'VIP Dupont',
          statut: 'EN_ATTENTE',
          items: [{ id: 1, cocktailId: 10, cocktailNom: 'Mojito', quantite: 1, prioritaire: false }],
        } as any,
        {
          id: 2,
          barTabNom: 'Comptoir Direct',
          statut: 'EN_ATTENTE',
          items: [{ id: 2, cocktailId: 20, cocktailNom: 'Negroni', quantite: 1, prioritaire: false }],
        } as any,
        {
          id: 3,
          statut: 'EN_ATTENTE',
          items: [{ id: 3, cocktailId: 30, cocktailNom: 'Bière', quantite: 1, prioritaire: false }],
        } as any,
      ];

      component.commandesEnAttente = cmds;
      component.searchQuery = 'Dupont';
      expect(component.filteredCommandesEnAttente).toHaveSize(1);
      expect(component.filteredCommandesEnAttente[0].id).toBe(1);

      component.searchQuery = 'Comptoir';
      expect(component.filteredCommandesEnAttente).toHaveSize(1);
      expect(component.filteredCommandesEnAttente[0].id).toBe(2);

      component.searchQuery = 'Bar';
      expect(component.filteredCommandesEnAttente.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('direct order taking button', () => {
    it('should render take order button with link to /serveur and tab=commande query param', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const takeOrderBtn = compiled.querySelector('[data-testid="barman-take-order-btn"]');
      expect(takeOrderBtn).toBeTruthy();
      expect(takeOrderBtn?.getAttribute('routerLink')).toBe('/serveur');
    });
  });

  describe('mobile kanban tabs responsiveness', () => {
    it('defaults activeMobileTab to PENDING and switches correctly', () => {
      expect(component.activeMobileTab).toBe('PENDING');
      component.activeMobileTab = 'IN_PROGRESS';
      expect(component.activeMobileTab).toBe('IN_PROGRESS');
      component.activeMobileTab = 'READY';
      expect(component.activeMobileTab).toBe('READY');
    });

    it('renders mobile kanban tabs in tickets view mode and updates on tab click', () => {
      component.activeViewMode = 'tickets';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const tabsEl = compiled.querySelector('[data-testid="mobile-kanban-tabs"]');
      expect(tabsEl).toBeTruthy();

      const inProgressBtn = compiled.querySelector('[data-testid="tab-mobile-inprogress"]') as HTMLButtonElement;
      expect(inProgressBtn).toBeTruthy();
      inProgressBtn.click();
      fixture.detectChanges();
      expect(component.activeMobileTab).toBe('IN_PROGRESS');

      const readyBtn = compiled.querySelector('[data-testid="tab-mobile-ready"]') as HTMLButtonElement;
      readyBtn.click();
      fixture.detectChanges();
      expect(component.activeMobileTab).toBe('READY');
    });

    it('renders mobile batch tabs in batch view mode and updates on tab click', () => {
      component.activeViewMode = 'batch';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const batchTabsEl = compiled.querySelector('[data-testid="mobile-batch-kanban-tabs"]');
      expect(batchTabsEl).toBeTruthy();

      const inProgressBatchBtn = compiled.querySelector('[data-testid="tab-mobile-batch-inprogress"]') as HTMLButtonElement;
      expect(inProgressBatchBtn).toBeTruthy();
      inProgressBatchBtn.click();
      fixture.detectChanges();
      expect(component.activeBatchMobileTab).toBe('IN_PROGRESS');
    });
  });

  describe('Kitchen Mode Adaptation', () => {
    it('detects kitchen mode when isKitchenModeInput is true and initializes stationFilter to KITCHEN', () => {
      component.isKitchenModeInput = true;
      component.ngOnInit();
      expect(component.isKitchenMode).toBeTrue();
      expect(component.stationFilter).toBe('KITCHEN');
    });

    it('strictly hides roulette TV button when in kitchen mode', () => {
      component.isKitchenModeInput = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const rouletteBtn = compiled.querySelector('[data-testid="barman-roulette-tv-btn"]');
      expect(rouletteBtn).toBeNull();
    });

    it('subscribes to kitchen and snack WebSocket topics when in kitchen mode', () => {
      wsServiceSpy.watch.calls.reset();
      component.isKitchenModeInput = true;
      component.ngOnInit();
      expect(wsServiceSpy.watch).toHaveBeenCalledWith('/topic/preparation/kitchen');
      expect(wsServiceSpy.watch).toHaveBeenCalledWith('/topic/preparation/snack');
    });

    it('filters orders by kitchen station correctly', () => {
      component.stationFilter = 'KITCHEN';
      const kitchenOrder: CommandeView = {
        id: 10,
        tableNom: 'Table 10',
        tableNumero: 10,
        serveurNom: 'Alice',
        dateCommande: new Date(),
        prioritaire: false,
        statut: 'EN_ATTENTE',
        items: [
          {
            id: 101,
            cocktailNom: 'Burger Frites',
            quantite: 1,
            station: 'KITCHEN',
            statut: 'EN_ATTENTE',
            prioritaire: false
          }
        ]
      };
      const barOrder: CommandeView = {
        id: 11,
        tableNom: 'Table 11',
        tableNumero: 11,
        serveurNom: 'Alice',
        dateCommande: new Date(),
        prioritaire: false,
        statut: 'EN_ATTENTE',
        items: [
          {
            id: 102,
            cocktailNom: 'Gin Tonic',
            quantite: 1,
            station: 'BAR',
            statut: 'EN_ATTENTE',
            prioritaire: false
          }
        ]
      };
      component.commandesEnAttente = [kitchenOrder, barOrder];
      expect(component.filteredCommandesEnAttente).toEqual([kitchenOrder]);
    });
  });

  describe('Audio Alerts & Rush Urgency (#564)', () => {
    it('should trigger urgent order audio alert when pending order exceeds 10 minutes wait', () => {
      const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
      component.commandesEnAttente = [
        {
          id: 501,
          tableNom: 'Table 5',
          tableNumero: 5,
          serveurNom: 'Bob',
          dateCommande: elevenMinutesAgo,
          prioritaire: false,
          statut: 'EN_ATTENTE',
          items: [{ id: 1, cocktailNom: 'Mojito', quantite: 1, statut: 'EN_ATTENTE', prioritaire: false }]
        }
      ];

      component.checkUrgentOrdersAudio();
      expect(soundServiceSpy.triggerUrgentOrderAlert).toHaveBeenCalledWith(501);
    });

    it('should clear urgent alerts for orders that have moved to preparation or ready', () => {
      component.commandesEnPreparation = [
        {
          id: 501,
          tableNom: 'Table 5',
          tableNumero: 5,
          serveurNom: 'Bob',
          dateCommande: new Date(),
          prioritaire: false,
          statut: 'EN_PREPARATION',
          items: [{ id: 1, cocktailNom: 'Mojito', quantite: 1, statut: 'EN_PREPARATION', prioritaire: false }]
        }
      ];

      component.checkUrgentOrdersAudio();
      expect(soundServiceSpy.clearUrgentOrder).toHaveBeenCalledWith(501);
    });

    it('should clear all urgent orders on component destruction', () => {
      component.ngOnDestroy();
      expect(soundServiceSpy.clearAllUrgentOrders).toHaveBeenCalled();
    });
  });

  describe('Quick Waste Log & Undo Flow', () => {
    it('openQuickWasteModal — opens QuickWasteLogModalComponent', async () => {
      await component.openQuickWasteModal();
      expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
        component: QuickWasteLogModalComponent,
        cssClass: 'quick-waste-modal-container'
      }));
    });

    it('openQuickWasteModal — on dismiss with saved movement, presents 10s undo toast', async () => {
      const mockSavedMovement: StockMovement = {
        id: 88,
        ingredientId: 5,
        ingredientNom: 'Gin Bombay',
        quantity: 4,
        unit: 'cl',
        reason: 'ERREUR_PREPARATION',
        reportedByUsername: 'barman1',
        cost: 2.0,
        recordedAt: '2026-10-20T20:00:00Z'
      };

      const customModal = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({
          data: { saved: true, movement: mockSavedMovement },
          role: 'saved'
        }))
      };
      modalCtrlSpy.create.and.returnValue(Promise.resolve(customModal as any));

      await component.openQuickWasteModal();

      expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
        duration: 10000,
        cssClass: 'quick-waste-undo-toast'
      }));
    });

    it('revertQuickWasteMovement — calls stockWasteService.revertQuickLog and presents confirmation toast', () => {
      const mockMovement: StockMovement = {
        id: 88,
        ingredientId: 5,
        ingredientNom: 'Gin Bombay',
        quantity: 4,
        unit: 'cl',
        reason: 'ERREUR_PREPARATION',
        reportedByUsername: 'barman1',
        cost: 2.0,
        recordedAt: '2026-10-20T20:00:00Z'
      };

      (component as any).revertQuickWasteMovement(mockMovement);

      expect(stockWasteServiceSpy.revertQuickLog).toHaveBeenCalledWith(88);
      expect(toastCtrlSpy.create).toHaveBeenCalled();
    });

    it('filter dropdown options and change handlers', () => {
      // Urgent filter options
      const urgentOpts = component.urgentFilterOptions;
      expect(urgentOpts.length).toBe(2);
      expect(urgentOpts[0].value).toBe(false);
      expect(urgentOpts[1].value).toBe(true);

      component.onUrgentFilterChange({ value: true, label: 'Urgent' });
      expect(component.urgentOnly).toBeTrue();

      component.onUrgentFilterChange({ value: false, label: 'Toutes' });
      expect(component.urgentOnly).toBeFalse();

      // Station filter options
      const stationOpts = component.stationFilterOptions;
      expect(stationOpts.length).toBeGreaterThanOrEqual(2);

      component.onStationFilterChange({ value: 'BAR', label: 'Bar' });
      expect(component.stationFilter).toBe('BAR');

      component.onStationFilterChange(null);
      expect(component.stationFilter).toBe('BAR');
    });
  });
});


