import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
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
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('DashboardBarmanComponent', () => {
  let component: DashboardBarmanComponent;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let wsServiceSpy: jasmine.SpyObj<WebSocketService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let settingsServiceSpy: jasmine.SpyObj<AppSettingsService>;
  let soundServiceSpy: jasmine.SpyObj<SoundService>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
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
  const mockModal = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

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
      'aggregateBatches'
    ]);
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
      'playUrgentAlertSound'
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

    await TestBed.configureTestingModule({
      imports: [
        DashboardBarmanComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: WebSocketService, useValue: wsServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AppSettingsService, useValue: settingsServiceSpy },
        { provide: SoundService, useValue: soundServiceSpy },
        { provide: CommandeService, useValue: commandeServiceSpy }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardBarmanComponent);
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

  it('onPrintTicket() opens 80mm thermal print modal', async () => {
    await component.onPrintTicket(mockCommandes[0]);
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
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
});

