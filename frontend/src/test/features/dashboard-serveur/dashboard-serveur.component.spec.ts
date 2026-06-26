import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
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
import { TableCardComponent } from '../../../app/features/dashboard-serveur/components/table-card/table-card.component';
import { TableView } from '../../../app/features/dashboard-serveur/models/table-view.model';

describe('DashboardServeurComponent', () => {
  let component: DashboardServeurComponent;
  let fixture: ComponentFixture<DashboardServeurComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardServeurService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let notification$: Subject<AppNotification>;

  const mockTables: TableView[] = [
    { id: 1, nom: 'Table 1', zone: 'Terrasse', capacite: 4, occupee: true, serveurNom: 'Alice', commandesActives: [] },
    { id: 2, nom: 'Table 2', zone: 'Salle', capacite: 2, occupee: false, commandesActives: [] },
    { id: 3, nom: 'Table 3', zone: 'Bar', capacite: 6, occupee: true, commandesActives: [] },
  ];

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    notification$ = new Subject<AppNotification>();

    dashboardServiceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getAllTables',
      'libererTable',
    ]);
    dashboardServiceSpy.getAllTables.and.returnValue(of(mockTables));
    dashboardServiceSpy.libererTable.and.returnValue(of({} as any));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert']);
    notificationServiceSpy.onNotification.and.returnValue(notification$.asObservable());
    notificationServiceSpy.onStockAlert.and.returnValue(EMPTY);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    const mockModal = { present: jasmine.createSpy('present'), onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: null })) };
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

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
      ],
      providers: [
        { provide: DashboardServeurService, useValue: dashboardServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
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

  it('ngOnInit() charge les tables au démarrage', () => {
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalled();
    expect(component.tables.length).toBe(3);
  });

  it('ngOnInit() souscrit aux notifications WS', () => {
    expect(notificationServiceSpy.onNotification).toHaveBeenCalled();
  });

  // --- filtrer() ---

  it('filtrer() avec "toutes" retourne toutes les tables', () => {
    component.selectedFilter = 'toutes';
    component.filtrer();
    expect(component.filteredTables.length).toBe(3);
  });

  it('filtrer() avec "occupees" ne retourne que les tables occupées', () => {
    component.selectedFilter = 'occupees';
    component.filtrer();
    expect(component.filteredTables.every(t => t.occupee)).toBeTrue();
    expect(component.filteredTables.length).toBe(2);
  });

  it('filtrer() avec "libres" ne retourne que les tables libres', () => {
    component.selectedFilter = 'libres';
    component.filtrer();
    expect(component.filteredTables.every(t => !t.occupee)).toBeTrue();
    expect(component.filteredTables.length).toBe(1);
  });

  // --- countOccupees / countLibres ---

  it('countOccupees retourne le bon nombre de tables occupées', () => {
    expect(component.countOccupees).toBe(2);
  });

  it('countLibres retourne le bon nombre de tables libres', () => {
    expect(component.countLibres).toBe(1);
  });

  // --- onSegmentChange() ---

  it('onSegmentChange() met à jour le filtre et relance filtrer()', () => {
    const event = { detail: { value: 'occupees' } };
    component.onSegmentChange(event);
    expect(component.selectedFilter).toBe('occupees');
    expect(component.filteredTables.length).toBe(2);
  });

  // --- chargerTables() ---

  it('chargerTables() met isLoading à false après la réponse', fakeAsync(() => {
    component.chargerTables();
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  it('chargerTables() appelle complete() sur l\'event de refresh si présent', fakeAsync(() => {
    const target = { complete: jasmine.createSpy('complete') };
    const refreshEvent = { target };
    component.chargerTables(refreshEvent);
    tick();
    expect(target.complete).toHaveBeenCalled();
  }));

  it('chargerTables() affiche un toast d\'erreur en cas d\'échec', fakeAsync(() => {
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
    // getAllTables appelé une fois au ngOnInit + une fois après liberer
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalledTimes(2);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));
  }));

  it('onLiberer() affiche un toast d\'erreur si libererTable échoue', fakeAsync(() => {
    dashboardServiceSpy.libererTable.and.returnValue(throwError(() => new Error('Forbidden')));
    component.onLiberer(99);
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  }));

  // --- Notification WS ---

  it('recharge les tables à la réception d\'une notification de type "table"', fakeAsync(() => {
    const notif: AppNotification = {
      id: 'table-1',
      type: 'table',
      message: 'Table libérée',
      severity: 'success',
      timestamp: new Date(),
      lue: false
    };
    notification$.next(notif);
    tick();
    // 1 appel au ngOnInit + 1 appel déclenché par la notif
    expect(dashboardServiceSpy.getAllTables).toHaveBeenCalledTimes(2);
  }));

  it('recharge les tables à la réception d\'une notification de type "commande"', fakeAsync(() => {
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

  it('onRefresh() délègue à chargerTables avec l\'event', fakeAsync(() => {
    const target = { complete: jasmine.createSpy('complete') };
    const event = { target };
    component.onRefresh(event);
    tick();
    expect(target.complete).toHaveBeenCalled();
  }));

  // --- ngOnDestroy ---

  it('ngOnDestroy() complète le Subject destroy$ sans erreur', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
