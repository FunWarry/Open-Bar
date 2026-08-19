import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { DashboardBarmanComponent } from '../../../app/features/dashboard-barman/dashboard-barman.component';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { AppSettingsService } from '../../../app/core/services/app-settings.service';
import { SoundService } from '../../../app/core/services/sound.service';
import { WebSocketService } from '../../../app/core/services/websocket.service';
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
      'updateIngredientStock'
    ]);
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of(mockCommandes));
    dashboardServiceSpy.getCommandesEnPreparation.and.returnValue(of([]));
    dashboardServiceSpy.getCommandesPret.and.returnValue(of([]));
    dashboardServiceSpy.changerStatut.and.returnValue(of(mockCommandes[0]));
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
        { provide: SoundService, useValue: soundServiceSpy }
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

  it('chargerCommandes() affiche un toast danger en cas d erreur', fakeAsync(() => {
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

  it('onChangerStatut() affiche un toast danger en cas d erreur', fakeAsync(() => {
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

  it('onPrintTicket() ouvre la modale d impression thermique 80mm', async () => {
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
});
