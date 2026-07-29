import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { DashboardBarmanComponent } from '../../../app/features/dashboard-barman/dashboard-barman.component';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';

describe('DashboardBarmanComponent', () => {
  let component: DashboardBarmanComponent;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let notification$: Subject<AppNotification>;

  const mockCommandes: CommandeView[] = [
    {
      id: 1,
      tableNom: 'Table 1',
      serveurNom: 'Alice',
      statut: 'EN_ATTENTE',
      items: [{ id: 10, cocktailNom: 'Mojito', quantite: 2, prioritaire: false }],
      dateCommande: new Date(),
      prioritaire: false,
    },
  ];

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    notification$ = new Subject<AppNotification>();

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', [
      'getCommandesEnAttente',
      'getCommandesEnPreparation',
      'getCommandesPret',
      'changerStatut',
    ]);
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of(mockCommandes));
    dashboardServiceSpy.getCommandesEnPreparation.and.returnValue(of([]));
    dashboardServiceSpy.getCommandesPret.and.returnValue(of([]));
    dashboardServiceSpy.changerStatut.and.returnValue(of({}));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert']);
    notificationServiceSpy.onNotification.and.returnValue(notification$.asObservable());
    notificationServiceSpy.onStockAlert.and.returnValue(EMPTY);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        DashboardBarmanComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
      ],
      providers: [
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardBarmanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('chargerCommandes() peuple les trois colonnes du kanban', fakeAsync(() => {
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(of(mockCommandes));
    dashboardServiceSpy.getCommandesEnPreparation.and.returnValue(of([{ ...mockCommandes[0], id: 2, statut: 'EN_PREPARATION' as const }]));
    dashboardServiceSpy.getCommandesPret.and.returnValue(of([{ ...mockCommandes[0], id: 3, statut: 'PRET' as const }]));

    component.chargerCommandes();
    tick();

    expect(component.commandesEnAttente).toHaveSize(1);
    expect(component.commandesEnPreparation).toHaveSize(1);
    expect(component.commandesPret).toHaveSize(1);
  }));

  it('chargerCommandes() appelle les trois endpoints du service', fakeAsync(() => {
    component.chargerCommandes();
    tick();

    expect(dashboardServiceSpy.getCommandesEnAttente).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesEnPreparation).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesPret).toHaveBeenCalled();
  }));

  it('chargerCommandes() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    dashboardServiceSpy.getCommandesEnAttente.and.returnValue(throwError(() => new Error('Network error')));

    component.chargerCommandes();
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onChangerStatut() appelle changerStatut() et recharge les commandes', fakeAsync(() => {
    const callCountBefore = dashboardServiceSpy.getCommandesEnAttente.calls.count();

    component.onChangerStatut({ id: 1, statut: 'EN_PREPARATION' });
    tick();
    flushMicrotasks();

    expect(dashboardServiceSpy.changerStatut).toHaveBeenCalledWith(1, 'EN_PREPARATION');
    expect(dashboardServiceSpy.getCommandesEnAttente.calls.count()).toBeGreaterThan(callCountBefore);
  }));

  it('onChangerStatut() affiche un toast success après changement réussi', fakeAsync(() => {
    dashboardServiceSpy.changerStatut.and.returnValue(of({}));

    component.onChangerStatut({ id: 1, statut: 'PRET' });
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onChangerStatut() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    dashboardServiceSpy.changerStatut.and.returnValue(throwError(() => new Error('API error')));

    component.onChangerStatut({ id: 1, statut: 'PRET' });
    tick();
    flushMicrotasks();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onRefresh() appelle chargerCommandes() et complete l\'event après 500ms', fakeAsync(() => {
    const completeSpy = jasmine.createSpy('complete');
    const mockEvent = { target: { complete: completeSpy } };

    component.onRefresh(mockEvent);
    tick(500);

    expect(completeSpy).toHaveBeenCalled();
    expect(dashboardServiceSpy.getCommandesEnAttente).toHaveBeenCalled();
  }));

  it('recharge les commandes sur notification WS de type "commande"', fakeAsync(() => {
    const callCountBefore = dashboardServiceSpy.getCommandesEnAttente.calls.count();

    notification$.next({
      id: 'commande-1',
      type: 'commande',
      message: 'Nouvelle commande',
      severity: 'primary',
      timestamp: new Date(),
      lue: false,
    });
    tick();

    expect(dashboardServiceSpy.getCommandesEnAttente.calls.count()).toBeGreaterThan(callCountBefore);
  }));

  it('recharge les commandes sur notification WS de type "statut"', fakeAsync(() => {
    const callCountBefore = dashboardServiceSpy.getCommandesEnAttente.calls.count();

    notification$.next({
      id: 'statut-1',
      type: 'statut',
      message: 'Statut mis à jour',
      severity: 'success',
      timestamp: new Date(),
      lue: false,
    });
    tick();

    expect(dashboardServiceSpy.getCommandesEnAttente.calls.count()).toBeGreaterThan(callCountBefore);
  }));

  it('ne recharge pas les commandes sur notification de type "stock"', fakeAsync(() => {
    const callCountBefore = dashboardServiceSpy.getCommandesEnAttente.calls.count();

    notification$.next({
      id: 'stock-1',
      type: 'stock',
      message: 'Stock faible',
      severity: 'warning',
      timestamp: new Date(),
      lue: false,
    });
    tick();

    expect(dashboardServiceSpy.getCommandesEnAttente.calls.count()).toBe(callCountBefore);
  }));

  it('trackById() retourne l\'id de la commande', () => {
    const cmd = mockCommandes[0];
    expect(component.trackById(0, cmd)).toBe(cmd.id);
  });

  it('hasUrgentOrders retourne true si une commande en attente a plus de 5 minutes', () => {
    const oldDate = new Date(Date.now() - 6 * 60 * 1000);
    component.commandesEnAttente = [
      { ...mockCommandes[0], dateCommande: oldDate }
    ];
    expect(component.hasUrgentOrders).toBeTrue();
  });

  it('hasUrgentOrders retourne false si toutes les commandes ont moins de 5 minutes', () => {
    component.commandesEnAttente = [
      { ...mockCommandes[0], dateCommande: new Date() }
    ];
    expect(component.hasUrgentOrders).toBeFalse();
  });

  it('ngOnDestroy() complète le subject destroy$', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
