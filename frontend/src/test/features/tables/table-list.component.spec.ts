import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TableListComponent } from '../../../app/features/tables/table-list/table-list.component';
import { TableService } from '../../../app/core/services/table.service';
import { ZoneService, ZoneBar } from '../../../app/core/services/zone.service';
import { EtageService, EtageBar } from '../../../app/core/services/etage.service';
import { TableBar } from '../../../app/core/models/table.model';

const mockTables: TableBar[] = [
  { id: 1, numero: 1, capacite: 4, zone: 'TERRASSE', occupee: false, createdAt: '', updatedAt: '' },
  { id: 2, numero: 2, capacite: 2, zone: 'INTERIEUR', occupee: true,  createdAt: '', updatedAt: '' },
  { id: 3, numero: 10, capacite: 6, zone: 'TERRASSE', occupee: true, createdAt: '', updatedAt: '' }
];

const mockZones: ZoneBar[] = [
  { id: 1, nom: 'TERRASSE', etage: 'RDC' },
  { id: 2, nom: 'INTERIEUR', etage: 'RDC' },
  { id: 3, nom: 'MEZZANINE', etage: 'ETAGE_1' }
];

const mockEtages: EtageBar[] = [
  { id: 1, code: 'RDC', nom: 'Ground Floor', ordre: 1 },
  { id: 2, code: 'ETAGE_1', nom: 'First Floor', ordre: 2 }
];

describe('TableListComponent', () => {
  let component: TableListComponent;
  let fixture: ComponentFixture<TableListComponent>;
  let serviceSpy: jasmine.SpyObj<TableService>;
  let zoneServiceSpy: jasmine.SpyObj<ZoneService>;
  let etageServiceSpy: jasmine.SpyObj<EtageService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };
  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: true } }))
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TableService', ['getAll', 'occuper', 'liberer', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockTables));
    serviceSpy.occuper.and.returnValue(of({ ...mockTables[0], occupee: true }));
    serviceSpy.liberer.and.returnValue(of({ ...mockTables[1], occupee: false }));
    serviceSpy.delete.and.returnValue(of(undefined as any));

    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll']);
    zoneServiceSpy.getAll.and.returnValue(of(mockZones));

    etageServiceSpy = jasmine.createSpyObj('EtageService', ['getAll']);
    etageServiceSpy.getAll.and.returnValue(of(mockEtages));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    storeSpy = jasmine.createSpyObj('Store', ['select']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [
        TableListComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        HttpClientTestingModule,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: TableService, useValue: serviceSpy },
        { provide: ZoneService, useValue: zoneServiceSpy },
        { provide: EtageService, useValue: etageServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(TableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('charge les tables au démarrage', () => {
    expect(serviceSpy.getAll).toHaveBeenCalled();
    expect(component.tables).toHaveSize(3);
  });

  it('calcule correctement les statistiques des tables', () => {
    const stats = component.tableStats;
    expect(stats.totalCount).toBe(3);
    expect(stats.freeCount).toBe(1);
    expect(stats.occupiedCount).toBe(2);
    expect(stats.totalCapacity).toBe(12);
    expect(stats.occupiedCapacity).toBe(8);
  });

  it('filtre les tables par terme de recherche (numéro)', () => {
    component.searchTerm = '10';
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].numero).toBe(10);
  });

  it('filtre les tables par statut LIBRE', () => {
    component.selectedStatus = 'FREE';
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].occupee).toBeFalse();
  });

  it('filtre les tables par statut OCCUPEE', () => {
    component.selectedStatus = 'OCCUPIED';
    expect(component.filteredTables).toHaveSize(2);
  });

  it('filtre les tables par zone', () => {
    component.selectedZone = 'INTERIEUR';
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].zone).toBe('INTERIEUR');
  });

  it('filtre les tables par etage', () => {
    component.selectedEtage = 'RDC';
    expect(component.filteredTables).toHaveSize(3);

    component.selectedEtage = 'ETAGE_1';
    expect(component.filteredTables).toHaveSize(0);
  });

  it('trie les tables par numero croissant', () => {
    component.sortOption = 'NUMBER_ASC';
    const sorted = component.filteredTables;
    expect(sorted[0].numero).toBe(1);
    expect(sorted[1].numero).toBe(2);
    expect(sorted[2].numero).toBe(10);
  });

  it('trie les tables par numero decroissant', () => {
    component.sortOption = 'NUMBER_DESC';
    const sorted = component.filteredTables;
    expect(sorted[0].numero).toBe(10);
    expect(sorted[1].numero).toBe(2);
    expect(sorted[2].numero).toBe(1);
  });

  it('trie les tables par capacite decroissante', () => {
    component.sortOption = 'CAPACITY_DESC';
    const sorted = component.filteredTables;
    expect(sorted[0].capacite).toBe(6);
    expect(sorted[1].capacite).toBe(4);
    expect(sorted[2].capacite).toBe(2);
  });

  it('groupedByZone regroupe les tables par zone', () => {
    const groups = component.groupedByZone;
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const terrasseGroup = groups.find(g => g.zoneName === 'TERRASSE');
    expect(terrasseGroup).toBeDefined();
    expect(terrasseGroup?.tables).toHaveSize(2);
  });

  it('groupedByFloor regroupe les tables par etage', () => {
    const groups = component.groupedByFloor;
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const rdcGroup = groups.find(g => g.etageCode === 'RDC');
    expect(rdcGroup).toBeDefined();
    expect(rdcGroup?.tables).toHaveSize(3);
  });

  it('onToggleStatus bascule l\'occupation d\'une table', () => {
    component.onToggleStatus(mockTables[0]);
    expect(serviceSpy.occuper).toHaveBeenCalledWith(1);

    component.onToggleStatus(mockTables[1]);
    expect(serviceSpy.liberer).toHaveBeenCalledWith(2);
  });

  it('onAdd() ouvre la modal TableFormComponent', fakeAsync(() => {
    component.onAdd();
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: { tableId: null }
    }));
    expect(mockModal.present).toHaveBeenCalled();
  }));

  it('onView() ouvre la modal TableDetailComponent', fakeAsync(() => {
    component.onView(mockTables[0]);
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: { tableId: 1, table: mockTables[0] }
    }));
    expect(mockModal.present).toHaveBeenCalled();
  }));

  it('onEdit() ouvre la modal TableFormComponent en mode édition', fakeAsync(() => {
    component.onEdit(mockTables[0]);
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: { tableId: 1, table: mockTables[0] }
    }));
    expect(mockModal.present).toHaveBeenCalled();
  }));

  it('onDelete() demande confirmation via modal et appelle tableService.delete', fakeAsync(() => {
    component.onDelete(mockTables[0]);
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(serviceSpy.delete).toHaveBeenCalledWith(1);
  }));

  it('isAdmin$ emits false by default', (done) => {
    component.isAdmin$.subscribe(v => { expect(v).toBe(false); done(); });
  });

  it('etageOptions, zoneOptions and sortOptions return formatted SearchableOption items and handlers work', () => {
    component.charger();
    expect(component.etageOptions).toHaveSize(3); // ALL + 2 floors
    expect(component.zoneOptions).toHaveSize(4);  // ALL + 3 zones
    expect(component.sortOptions).toHaveSize(7);

    component.onEtageSelected({ value: 'ETAGE_1', label: 'First Floor' });
    expect(component.selectedEtage).toBe('ETAGE_1');
    expect(component.selectedZone).toBe('ALL');

    component.onZoneSelected({ value: 'MEZZANINE', label: 'MEZZANINE' });
    expect(component.selectedZone).toBe('MEZZANINE');

    component.onSortSelected({ value: 'CAPACITY_ASC', label: 'Capacité croissante' });
    expect(component.sortOption).toBe('CAPACITY_ASC');
  });

  it('trackById retourne l\'id de la table', () => {
    expect(component.trackById(0, mockTables[0])).toBe(1);
  });
});
