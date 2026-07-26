import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import { PlanSalleComponent } from '../../../app/features/plan-salle/plan-salle.component';
import { PlanSalleService } from '../../../app/features/plan-salle/services/plan-salle.service';
import { TableService } from '../../../app/core/services/table.service';
import { NotificationService, AppNotification } from '../../../app/core/services/notification.service';
import { TableBar } from '../../../app/core/models/table.model';
import { TablePosition } from '../../../app/features/plan-salle/models/table-position.model';

const mockTables: TableBar[] = [
  { id: 1, numero: 1, capacite: 4, zone: 'TERRASSE', occupee: false, createdAt: '', updatedAt: '' },
  { id: 2, numero: 2, capacite: 2, zone: 'INTERIEUR', occupee: true,  createdAt: '', updatedAt: '' },
];

const mockPositions: TablePosition[] = [
  { tableId: 1, x: 100, y: 100, rotation: 0, shape: 'rect' },
  { tableId: 2, x: 200, y: 100, rotation: 0, shape: 'circle' },
];

describe('PlanSalleComponent', () => {
  let component: PlanSalleComponent;
  let fixture: ComponentFixture<PlanSalleComponent>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let planSalleServiceSpy: jasmine.SpyObj<PlanSalleService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let notif$: Subject<AppNotification>;

  const mockToast = { present: jasmine.createSpy('present') };
  let mockModalDismissData: any = { data: null };
  const mockModal = {
    present:       jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onWillDismiss: jasmine.createSpy('onWillDismiss').and.callFake(() => Promise.resolve(mockModalDismissData)),
  };

  beforeEach(async () => {
    notif$ = new Subject<AppNotification>();
    mockModalDismissData = { data: null };

    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll']);
    tableServiceSpy.getAll.and.returnValue(of(mockTables));

    planSalleServiceSpy = jasmine.createSpyObj('PlanSalleService', ['getPositions', 'sauvegarderPositions']);
    planSalleServiceSpy.getPositions.and.returnValue(of(mockPositions));
    planSalleServiceSpy.sauvegarderPositions.and.returnValue(of(mockPositions));

    notifSpy = jasmine.createSpyObj('NotificationService', ['onNotification', 'onStockAlert']);
    notifSpy.onNotification.and.returnValue(notif$.asObservable());
    notifSpy.onStockAlert.and.returnValue(EMPTY);

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    storeSpy = jasmine.createSpyObj('Store', ['select']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [PlanSalleComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: TableService,        useValue: tableServiceSpy },
        { provide: PlanSalleService,    useValue: planSalleServiceSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: ToastController,     useValue: toastCtrlSpy },
        { provide: ModalController,     useValue: modalCtrlSpy },
        { provide: Store,               useValue: storeSpy },
        { provide: NgZone,              useValue: new NgZone({ enableLongStackTrace: false }) },
        { provide: ChangeDetectorRef,   useValue: { detectChanges: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanSalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  // --- charger() ---

  it('charger() appelle TableService.getAll et PlanSalleService.getPositions', fakeAsync(() => {
    component.charger();
    tick();
    expect(tableServiceSpy.getAll).toHaveBeenCalled();
    expect(planSalleServiceSpy.getPositions).toHaveBeenCalled();
  }));

  it('charger() peuple tables et positions', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.tables.length).toEqual(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    tableServiceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- toggleEditMode ---

  it('toggleEditMode() ne s\'active pas si non admin', () => {
    component.isAdmin = false;
    component.toggleEditMode();
    expect(component.isEditMode).toBeFalse();
  });

  it('toggleEditMode() bascule isEditMode si admin', () => {
    component.isAdmin = true;
    component.toggleEditMode();
    expect(component.isEditMode).toBeTrue();
    component.toggleEditMode();
    expect(component.isEditMode).toBeFalse();
  });

  // --- sauvegarder ---

  it('sauvegarder() appelle planSalleService.sauvegarderPositions', fakeAsync(() => {
    component.sauvegarder();
    tick();
    flushMicrotasks();
    expect(planSalleServiceSpy.sauvegarderPositions).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('sauvegarder() remet hasUnsavedChanges à false', fakeAsync(() => {
    component.hasUnsavedChanges = true;
    component.sauvegarder();
    tick();
    flushMicrotasks();
    expect(component.hasUnsavedChanges).toBeFalse();
  }));

  it('sauvegarder() affiche un toast danger si le service échoue', fakeAsync(() => {
    planSalleServiceSpy.sauvegarderPositions.and.returnValue(throwError(() => new Error('err')));
    component.sauvegarder();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  // --- onClickTable & side panel ---

  it('onClickTable() ouvre le side panel pour la table sélectionnée', async () => {
    await component.onClickTable(mockTables[0]);
    expect(component.selectedTable).toEqual(mockTables[0]);
    expect(component.isSidePanelOpen).toBeTrue();
  });

  it('closeSidePanel() ferme le panneau latéral et réinitialise la table sélectionnée', () => {
    component.selectedTable = mockTables[0];
    component.isSidePanelOpen = true;
    component.closeSidePanel();
    expect(component.isSidePanelOpen).toBeFalse();
    expect(component.selectedTable).toBeNull();
  });

  // --- Fusion de tables ---

  it('onStartFusion() active le mode fusion et affiche un toast', fakeAsync(() => {
    component.onStartFusion(mockTables[0]);
    tick();
    expect(component.isFusionMode).toBeTrue();
    expect(component.fusionSourceTable).toEqual(mockTables[0]);
    expect(component.isSidePanelOpen).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'primary' }));
  }));

  it('onClickTable() en mode fusion déclenche la confirmation de fusion', async () => {
    component.isFusionMode = true;
    component.fusionSourceTable = mockTables[0];
    spyOn(component, 'confirmerFusion').and.returnValue(Promise.resolve());

    await component.onClickTable(mockTables[1]);
    expect(component.confirmerFusion).toHaveBeenCalledWith(mockTables[0], mockTables[1]);
  });

  it('confirmerFusion() fusionne les deux tables si confirmé', fakeAsync(() => {
    mockModalDismissData = { data: { confirmed: true } };
    component.tables = [...mockTables];
    component.isFusionMode = true;
    component.fusionSourceTable = mockTables[0];

    component.confirmerFusion(mockTables[0], mockTables[1]);
    tick();
    flushMicrotasks();

    expect(component.tables.length).toEqual(1);
    expect(component.tables[0].capacite).toBe(6); // 4 + 2
    expect(component.isFusionMode).toBeFalse();
    expect(component.fusionSourceTable).toBeNull();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('confirmerFusion() annule la fusion si non confirmé', fakeAsync(() => {
    mockModalDismissData = { data: { confirmed: false } };
    component.isFusionMode = true;
    component.fusionSourceTable = mockTables[0];

    component.confirmerFusion(mockTables[0], mockTables[1]);
    tick();
    flushMicrotasks();

    expect(component.isFusionMode).toBeFalse();
    expect(component.fusionSourceTable).toBeNull();
  }));

  // --- onSaveTable ---

  it('onSaveTable() met à jour la table sélectionnée et marque les changements', fakeAsync(() => {
    component.selectedTable = { ...mockTables[0] };
    component.onSaveTable({ capacite: 8, zone: 'TERRASSE' });
    tick();
    expect(component.selectedTable.capacite).toBe(8);
    expect(component.selectedTable.zone).toBe('TERRASSE');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onSaveTable() ne fait rien si selectedTable est null', () => {
    component.selectedTable = null;
    component.hasUnsavedChanges = false;
    component.onSaveTable({ capacite: 8 });
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  // --- toggleForme ---

  it('toggleForme() bascule la forme rect→circle pour une table existante', () => {
    (component as any).positions.set(1, { tableId: 1, x: 100, y: 100, rotation: 0, shape: 'rect' });
    component.tables = mockTables;
    component.toggleForme(1);
    expect((component as any).positions.get(1).shape).toBe('circle');
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('toggleForme() bascule la forme circle→rect', () => {
    (component as any).positions.set(2, { tableId: 2, x: 200, y: 100, rotation: 0, shape: 'circle' });
    component.tables = mockTables;
    component.toggleForme(2);
    expect((component as any).positions.get(2).shape).toBe('rect');
  });

  it('toggleForme() ne fait rien si la position est inconnue', () => {
    component.hasUnsavedChanges = false;
    component.toggleForme(999);
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  // --- WebSocket ---

  it('recharge les tables sur notification de type "table"', fakeAsync(() => {
    const before = tableServiceSpy.getAll.calls.count();
    notif$.next({ id: 't-1', type: 'table', message: '', severity: 'success', timestamp: new Date(), lue: false });
    tick();
    expect(tableServiceSpy.getAll.calls.count()).toBeGreaterThan(before);
  }));

  it('ne recharge pas sur notification de type "stock"', fakeAsync(() => {
    const before = tableServiceSpy.getAll.calls.count();
    notif$.next({ id: 's-1', type: 'stock', message: '', severity: 'warning', timestamp: new Date(), lue: false });
    tick();
    expect(tableServiceSpy.getAll.calls.count()).toBe(before);
  }));
});
