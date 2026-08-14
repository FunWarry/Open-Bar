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
import { ZoneService } from '../../../app/core/services/zone.service';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { PlanSalleService } from '../../../app/features/plan-salle/services/plan-salle.service';
import { provideMockStore } from '@ngrx/store/testing';

import { provideIonicAngular } from '@ionic/angular/standalone';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('DashboardServeurComponent', () => {
  let component: DashboardServeurComponent;
  let fixture: ComponentFixture<DashboardServeurComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardServeurService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let planSalleServiceSpy: jasmine.SpyObj<PlanSalleService>;
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

    localStorage.clear();
    dashboardServiceSpy = jasmine.createSpyObj('DashboardServeurService', [
      'getAllTables',
      'libererTable',
      'getEtages',
      'getZones',
      'getPlanSallePositions',
    ]);
    dashboardServiceSpy.getAllTables.and.returnValue(of(mockTables));
    dashboardServiceSpy.libererTable.and.returnValue(of({} as any));
    dashboardServiceSpy.getEtages.and.returnValue(of([]));
    dashboardServiceSpy.getZones.and.returnValue(of([]));
    dashboardServiceSpy.getPlanSallePositions.and.returnValue(of([]));

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

  it('filtrer() avec "OCCUPIED" ne retourne que les tables occupées', () => {
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

  it('countOccupees retourne le bon nombre de tables occupées', () => {
    expect(component.countOccupees).toBe(2);
  });

  it('countLibres retourne le bon nombre de tables libres', () => {
    expect(component.countLibres).toBe(1);
  });

  it('getWaitTimeMinutes() retourne 0 pour une table libre et > 0 pour une table occupée', () => {
    const libre = mockTables[1];
    const occupee = mockTables[0];

    expect(component.getWaitTimeMinutes(libre)).toBe(0);
    expect(component.getWaitTimeMinutes(occupee)).toBeGreaterThan(0);
  });

  // --- setStatusFilter() ---

  it('setStatusFilter() met à jour le filtre et relance filtrer()', () => {
    component.setStatusFilter('OCCUPIED');
    expect(component.selectedStatus).toBe('OCCUPIED');
    expect(component.filteredTables).toHaveSize(2);
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

  it('onEtageSelectChange() met à jour selectedEtage et filtre les tables', () => {
    const event = { target: { value: 'TERRASSE' } } as any;
    component.onEtageSelectChange(event);
    expect(component.selectedEtage).toBe('TERRASSE');
  });

  it('onZoneSelectChange() met à jour selectedZone et filtre les tables', () => {
    const event = { target: { value: 'Terrasse' } } as any;
    component.onZoneSelectChange(event);
    expect(component.selectedZone).toBe('Terrasse');
    expect(component.filteredTables.every(t => t.zone === 'Terrasse')).toBeTrue();
  });

  it('setDisplayMode() bascule entre les différents modes d\'affichage', () => {
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

  it('toggleZone(), isZoneSelected() et clearZoneFilter() gèrent la sélection multi-zones', () => {
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

  it('ngOnDestroy désinscrit les observables', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
