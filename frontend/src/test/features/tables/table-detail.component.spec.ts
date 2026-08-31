import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { IonicModule } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { TableDetailComponent } from '../../../app/features/tables/table-detail/table-detail.component';
import { TableService } from '../../../app/core/services/table.service';
import { CommandeService } from '../../../app/core/services/commande.service';
import { TableBar } from '../../../app/core/models/table.model';
import { Commande } from '../../../app/core/models/commande.model';

const mockTable: TableBar = { id: 5, numero: 5, capacite: 4, zone: 'TERRASSE', occupee: true, createdAt: '', updatedAt: '' };
const mockCommande: Commande = { id: 1, tableId: 5, tableNumero: 5, serveurId: 1, serveurUsername: 'alice', items: [], statut: 'EN_ATTENTE', total: 10, dateCommande: '', createdAt: '', updatedAt: '' };

describe('TableDetailComponent', () => {
  let component: TableDetailComponent;
  let tableServiceSpy: jasmine.SpyObj<TableService>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };
  const mockChildModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: { confirmed: true } }))
  };

  beforeEach(async () => {
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getById', 'delete']);
    tableServiceSpy.getById.and.returnValue(of(mockTable));
    tableServiceSpy.delete.and.returnValue(of(undefined as any));

    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['getByTable']);
    commandeServiceSpy.getByTable.and.returnValue(of([mockCommande]));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss', 'getTop']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));
    modalCtrlSpy.getTop.and.returnValue(Promise.resolve({ dismiss: jasmine.createSpy('dismiss') } as any));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockChildModal as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [TableDetailComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '5' } } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(TableDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('ngOnInit() charge la table et les commandes', fakeAsync(() => {
    component.ngOnInit(); tick();
    expect(component.table).toEqual(mockTable);
    expect(component.commandes).toHaveSize(1);
  }));

  it('ngOnInit() exclut les commandes REGLEE et ANNULEE', fakeAsync(() => {
    commandeServiceSpy.getByTable.and.returnValue(of([
      { ...mockCommande, statut: 'EN_ATTENTE' },
      { ...mockCommande, id: 2, statut: 'REGLEE' },
      { ...mockCommande, id: 3, statut: 'ANNULEE' },
    ] as Commande[]));
    component.ngOnInit(); tick();
    expect(component.commandes).toHaveSize(1);
  }));

  it('ngOnInit() navigue vers /tables ou dismiss modal en cas d\'erreur', fakeAsync(() => {
    tableServiceSpy.getById.and.returnValue(throwError(() => new Error('err')));
    component.table = null;
    component.ngOnInit(); tick();
    flushMicrotasks();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  }));

  it('getStatutColor() mappe les statuts correctement', () => {
    expect(component.getStatutColor('EN_ATTENTE')).toBe('warning');
    expect(component.getStatutColor('PRET')).toBe('success');
    expect(component.getStatutColor('ANNULEE')).toBe('danger');
    expect(component.getStatutColor('INCONNU')).toBe('primary');
  });

  it('onClose() ferme la modale', fakeAsync(() => {
    component.onClose();
    tick();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  }));

  it('onEdit() closes modal with signal edit', fakeAsync(() => {
    component.ngOnInit(); tick();
    component.onEdit();
    tick();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'edit' }));
  }));

  it('onDelete() opens ConfirmDeleteModalComponent and deletes table if confirmed', fakeAsync(() => {
    component.commandes = [];
    component.table = mockTable;

    component.onDelete();
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(tableServiceSpy.delete).toHaveBeenCalledWith(5);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({ action: 'deleted', tableId: 5 }));
  }));

  it('onViewCommande() ferme la modal et navigue vers /commandes/:id', fakeAsync(() => {
    spyOn(router, 'navigate');
    component.onViewCommande(mockCommande);
    tick();
    expect(router.navigate).toHaveBeenCalledWith(['/commandes', 1]);
  }));

  it('isAdmin$ emits false by default', (done) => {
    component.isAdmin$.subscribe(v => { expect(v).toBe(false); done(); });
  });

  it('onOpenQrModal() creates and presents TableQrModalComponent', fakeAsync(() => {
    component.table = mockTable;
    component.onOpenQrModal();
    tick();
    expect(modalCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      componentProps: { table: mockTable }
    }));
    expect(mockChildModal.present).toHaveBeenCalled();
  }));
});
