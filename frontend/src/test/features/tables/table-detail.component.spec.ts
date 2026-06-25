import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
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
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    tableServiceSpy = jasmine.createSpyObj('TableService', ['getById']);
    tableServiceSpy.getById.and.returnValue(of(mockTable));

    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['getByTable']);
    commandeServiceSpy.getByTable.and.returnValue(of([mockCommande]));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [TableDetailComponent, IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: TableService, useValue: tableServiceSpy },
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
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
    expect(component.commandes.length).toBe(1);
  }));

  it('ngOnInit() exclut les commandes REGLEE et ANNULEE', fakeAsync(() => {
    commandeServiceSpy.getByTable.and.returnValue(of([
      { ...mockCommande, statut: 'EN_ATTENTE' },
      { ...mockCommande, id: 2, statut: 'REGLEE' },
      { ...mockCommande, id: 3, statut: 'ANNULEE' },
    ] as Commande[]));
    component.ngOnInit(); tick();
    expect(component.commandes.length).toBe(1);
  }));

  it('ngOnInit() navigue vers /tables en cas d\'erreur', fakeAsync(() => {
    tableServiceSpy.getById.and.returnValue(throwError(() => new Error('err')));
    spyOn(router, 'navigate');
    component.ngOnInit(); tick();
    flushMicrotasks();
    expect(router.navigate).toHaveBeenCalledWith(['/tables']);
  }));

  it('getStatutColor() mappe les statuts correctement', () => {
    expect(component.getStatutColor('EN_ATTENTE')).toBe('warning');
    expect(component.getStatutColor('PRET')).toBe('success');
    expect(component.getStatutColor('ANNULEE')).toBe('danger');
    expect(component.getStatutColor('INCONNU')).toBe('primary');
  });

  it('onBack() navigue vers /tables', () => {
    spyOn(router, 'navigate');
    component.onBack();
    expect(router.navigate).toHaveBeenCalledWith(['/tables']);
  });

  it('onEdit() navigue vers /tables/:id/edit', fakeAsync(() => {
    component.ngOnInit(); tick();
    spyOn(router, 'navigate');
    component.onEdit();
    expect(router.navigate).toHaveBeenCalledWith(['/tables', 5, 'edit']);
  }));

  it('onViewCommande() navigue vers /commandes/:id', () => {
    spyOn(router, 'navigate');
    component.onViewCommande(mockCommande);
    expect(router.navigate).toHaveBeenCalledWith(['/commandes', 1]);
  });

  it('isAdmin$ émet false par défaut', (done) => {
    component.isAdmin$.subscribe(v => { expect(v).toBe(false); done(); });
  });
});
