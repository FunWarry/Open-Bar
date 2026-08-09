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
  { id: 1, code: 'RDC', nom: 'Rez-de-chaussée', ordre: 1 },
  { id: 2, code: 'ETAGE_1', nom: '1er Étage', ordre: 2 }
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

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TableService', ['getAll', 'occuper', 'liberer']);
    serviceSpy.getAll.and.returnValue(of(mockTables));
    serviceSpy.occuper.and.returnValue(of({ ...mockTables[0], occupee: true }));
    serviceSpy.liberer.and.returnValue(of({ ...mockTables[1], occupee: false }));

    zoneServiceSpy = jasmine.createSpyObj('ZoneService', ['getAll']);
    zoneServiceSpy.getAll.and.returnValue(of(mockZones));

    etageServiceSpy = jasmine.createSpyObj('EtageService', ['getAll']);
    etageServiceSpy.getAll.and.returnValue(of(mockEtages));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [TableListComponent, IonicModule.forRoot(), RouterTestingModule, HttpClientTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: TableService, useValue: serviceSpy },
        { provide: ZoneService, useValue: zoneServiceSpy },
        { provide: EtageService, useValue: etageServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(TableListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('charger() peuple tables, zones et etages depuis les services', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.tables).toHaveSize(3);
    expect(component.zones).toHaveSize(3);
    expect(component.etages).toHaveSize(2);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('calcule correctement tableStats', () => {
    const stats = component.tableStats;
    expect(stats.totalCount).toBe(3);
    expect(stats.freeCount).toBe(1);
    expect(stats.occupiedCount).toBe(2);
    expect(stats.occupancyRate).toBe(67); // 2/3 = 66.67 -> 67%
    expect(stats.totalCapacity).toBe(12); // 4 + 2 + 6
    expect(stats.occupiedCapacity).toBe(8); // 2 + 6
  });

  it('filtre les tables par statut', () => {
    component.setStatusFilter('FREE');
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].id).toBe(1);

    component.setStatusFilter('OCCUPIED');
    expect(component.filteredTables).toHaveSize(2);
  });

  it('filtre les tables par terme de recherche', () => {
    component.searchTerm = '10';
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].numero).toBe(10);
  });

  it('filtre les tables par zone et par etage', () => {
    component.selectedZone = 'INTERIEUR';
    expect(component.filteredTables).toHaveSize(1);
    expect(component.filteredTables[0].zone).toBe('INTERIEUR');

    component.selectedZone = 'ALL';
    component.selectedEtage = 'RDC';
    expect(component.filteredTables).toHaveSize(3);
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

  it('onAdd() navigue vers /tables/new', () => {
    spyOn(router, 'navigate');
    component.onAdd();
    expect(router.navigate).toHaveBeenCalledWith(['/tables/new']);
  });

  it('onView() navigue vers /tables/:id', () => {
    spyOn(router, 'navigate');
    component.onView(mockTables[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/tables', 1]);
  });

  it('onEdit() navigue vers /tables/:id/edit', () => {
    spyOn(router, 'navigate');
    component.onEdit(mockTables[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/tables', 1, 'edit']);
  });

  it('isAdmin$ émet false par défaut', (done) => {
    component.isAdmin$.subscribe(v => { expect(v).toBe(false); done(); });
  });

  it('trackById retourne l\'id de la table', () => {
    expect(component.trackById(0, mockTables[0])).toBe(1);
  });
});
