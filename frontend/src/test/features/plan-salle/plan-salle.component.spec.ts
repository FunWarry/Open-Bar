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

import { EtageService } from '../../../app/core/services/etage.service';
import { ZoneService } from '../../../app/core/services/zone.service';

import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockTables: TableBar[] = [
  { id: 1, numero: 1, capacite: 4, zone: 'TERRASSE', emplacement: 'RDC', occupee: false, createdAt: '', updatedAt: '' },
  { id: 2, numero: 2, capacite: 2, zone: 'INTERIEUR', emplacement: '1er Étage', occupee: true,  createdAt: '', updatedAt: '' },
];

const mockPositions: TablePosition[] = [
  { tableId: 1, x: 100, y: 100, rotation: 0, shape: 'rect', floor: 'RDC' },
  { tableId: 2, x: 200, y: 100, rotation: 0, shape: 'circle', floor: '1er Étage' },
];

describe('PlanSalleComponent', () => {
  let component: PlanSalleComponent;
  let fixture: ComponentFixture<PlanSalleComponent>;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let planSalleServiceSpy: jasmine.SpyObj<PlanSalleService>;
  let etageServiceSpy: jasmine.SpyObj<EtageService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;
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

    tableServiceSpy = jasmine.createSpyObj('TableService', ['getAll', 'update', 'create', 'delete']);
    tableServiceSpy.getAll.and.returnValue(of(mockTables));
    tableServiceSpy.update.and.callFake((id, t) => of({ ...mockTables[0], ...t, id } as any));
    tableServiceSpy.create.and.callFake(t => of({ ...mockTables[0], ...t, id: 10 } as any));
    tableServiceSpy.delete.and.returnValue(of(void 0));

    planSalleServiceSpy = jasmine.createSpyObj('PlanSalleService', ['getPositions', 'sauvegarderPositions']);
    planSalleServiceSpy.getPositions.and.returnValue(of(mockPositions));
    planSalleServiceSpy.sauvegarderPositions.and.returnValue(of(mockPositions));

    etageServiceSpy = jasmine.createSpyObj('EtageService', ['getAll']);
    etageServiceSpy.getAll.and.returnValue(of([{ code: 'RDC', nom: 'Rez-de-chaussée' }, { code: '1er Étage', nom: '1er Étage' }]));

    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll', 'update', 'create', 'delete']);
    zoneServiceSpy.getAll.and.returnValue(of([{ id: 1, nom: 'TERRASSE', etage: 'RDC' }]));
    zoneServiceSpy.update.and.callFake((id, z) => of({ id, nom: 'TERRASSE', etage: 'RDC', ...z } as any));
    zoneServiceSpy.create.and.callFake(z => of({ id: 2, nom: 'NOUVELLE', etage: 'RDC', ...z } as any));
    zoneServiceSpy.delete.and.returnValue(of(void 0));

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
      imports: [PlanSalleComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: TableService,        useValue: tableServiceSpy },
        { provide: PlanSalleService,    useValue: planSalleServiceSpy },
        { provide: EtageService,        useValue: etageServiceSpy },
        { provide: ZoneService,         useValue: zoneServiceSpy },
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
    expect(component.tables).toHaveSize(2);
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

  it('onClickTable() ouvre le side panel pour la table sélectionnée en mode édition', async () => {
    component.isEditMode = true;
    await component.onClickTable(mockTables[0]);
    expect(component.selectedTable as any).toEqual(mockTables[0]);
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

  it('onClickTable() ne fait rien et n\'ouvre pas le side panel si isEditMode est faux', async () => {
    component.isEditMode = false;
    component.selectedTable = null;
    component.isSidePanelOpen = false;

    await component.onClickTable(mockTables[0]);

    expect(component.selectedTable).toBeNull();
    expect(component.isSidePanelOpen).toBeFalse();
  });

  it('onClickTable() sélectionne la table et ouvre le side panel si isEditMode est vrai', async () => {
    component.isEditMode = true;
    component.selectedTable = null;
    component.isSidePanelOpen = false;

    await component.onClickTable(mockTables[0]);

    expect(component.selectedTable as any).toEqual(mockTables[0]);
    expect(component.isSidePanelOpen).toBeTrue();
  });

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

    expect(component.tables).toHaveSize(1);
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

  it('onSaveTable() met à jour la table sélectionnée et persiste les changements', fakeAsync(() => {
    component.selectedTable = { ...mockTables[0] };
    component.onSaveTable({ capacite: 8, zone: 'TERRASSE' });
    tick();
    expect(component.selectedTable.capacite).toBe(8);
    expect(component.selectedTable.zone).toBe('TERRASSE');
    expect(tableServiceSpy.update).toHaveBeenCalled();
    expect(planSalleServiceSpy.sauvegarderPositions).toHaveBeenCalled();
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

  it('onSaveTable() ne fait rien si selectedTable est null', () => {
    component.selectedTable = null;
    component.hasUnsavedChanges = false;
    component.onSaveTable({ capacite: 8 });
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('onLiveUpdateTable() met à jour la forme et les dimensions en direct sans erreur', fakeAsync(() => {
    component.charger();
    tick();
    component.selectedTable = { ...mockTables[0] };
    (component as any).positions.set(1, { tableId: 1, x: 100, y: 100, width: 90, height: 90, rotation: 0, shape: 'rect' });

    // Live update shape from rect to circle
    component.onLiveUpdateTable({
      table: { numero: 1, capacite: 6 },
      position: { shape: 'circle', width: 100, height: 100 },
    });
    tick();

    expect(component.selectedTable.capacite).toBe(6);
    const updatedPos = (component as any).positions.get(1);
    expect(updatedPos.shape).toBe('circle');
    expect(updatedPos.width).toBe(100);
    expect(component.hasUnsavedChanges).toBeTrue();

    // Live update back to rect
    component.onLiveUpdateTable({
      table: { numero: 1 },
      position: { shape: 'rect', width: 120, height: 80 },
    });
    tick();
    expect((component as any).positions.get(1).shape).toBe('rect');
    expect((component as any).positions.get(1).width).toBe(120);
  }));

  it('onSaveTableAndPosition() met à jour table, position, persiste et dessine le plan', fakeAsync(() => {
    component.charger();
    tick();
    component.selectedTable = { ...mockTables[0] };
    component.onSaveTableAndPosition({
      table: { numero: 1, capacite: 8, zone: 'TERRASSE' },
      position: { width: 110, height: 110, rotation: 45, shape: 'circle' },
    });
    tick();

    expect(component.tables.find(t => t.id === 1)?.capacite).toBe(8);
    expect(component.selectedTable).toBeNull();
    const pos = (component as any).positions.get(1);
    expect(pos.width).toBe(110);
    expect(pos.rotation).toBe(45);
    expect(pos.shape).toBe('circle');
    expect(tableServiceSpy.update).toHaveBeenCalled();
    expect(planSalleServiceSpy.sauvegarderPositions).toHaveBeenCalled();
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'success' }));
  }));

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

  it('selectFloor() filtre les tables par étage', fakeAsync(() => {
    component.charger();
    tick();
    component.selectFloor('RDC');
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].numero).toBe(1);

    component.selectFloor('1er Étage');
    expect(component.filteredTables).toHaveSize(1);
  }));

  it('ajouterNouvelleTable() crée une nouvelle table et l\'ajoute au plan', fakeAsync(() => {
    component.charger();
    tick();
    const countBefore = component.tables.length;
    component.ajouterNouvelleTable();
    expect(component.tables).toHaveSize(countBefore + 1);
    expect(component.hasUnsavedChanges).toBeTrue();
  }));

  it('pivoterTableSelectionnee() pivote la table sélectionnée de 90°', fakeAsync(() => {
    component.charger();
    tick();
    component.selectedTable = mockTables[0];
    component.pivoterTableSelectionnee();
    expect(component.hasUnsavedChanges).toBeTrue();
  }));

  it('onDeleteTable() supprime la table du plan et persiste la suppression', fakeAsync(() => {
    component.charger();
    tick();
    const countBefore = component.tables.length;
    component.onDeleteTable(1);
    tick();
    expect(component.tables).toHaveSize(countBefore - 1);
    expect(tableServiceSpy.delete).toHaveBeenCalledWith(1);
    expect(planSalleServiceSpy.sauvegarderPositions).toHaveBeenCalled();
    expect(component.hasUnsavedChanges).toBeFalse();
  }));

  it('toggleGridSnap() bascule l\'état de la grille et affiche un toast', () => {
    const init = component.isGridSnapEnabled;
    component.toggleGridSnap();
    expect(component.isGridSnapEnabled).toBe(!init);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'info' }));
  });

  it('toggleMagnetSnap() bascule l\'état de l\'aimantation et affiche un toast', () => {
    const init = component.isMagnetSnapEnabled;
    component.toggleMagnetSnap();
    expect(component.isMagnetSnapEnabled).toBe(!init);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'info' }));
  });
});
