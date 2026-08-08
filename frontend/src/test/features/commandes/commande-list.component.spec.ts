import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { of, throwError } from 'rxjs';
import { CommandeListComponent } from '../../../app/features/commandes/commande-list/commande-list.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { Commande } from '../../../app/core/models/commande.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const makeCmd = (id: number, statut: Commande['statut'], tableNumero = 1, notes = ''): Commande => ({
  id,
  tableId: tableNumero,
  tableNumero,
  serveurId: 1,
  serveurUsername: 'alice',
  items: [{ id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 9.5 }],
  statut,
  total: 19,
  dateCommande: new Date(Date.now() - 5 * 60000).toISOString(),
  notes,
  createdAt: '',
  updatedAt: '',
});

const mockCommandes: Commande[] = [
  makeCmd(1, 'EN_ATTENTE', 1),
  makeCmd(2, 'EN_PREPARATION', 2),
  makeCmd(3, 'PRET', 3),
  makeCmd(4, 'LIVREE', 4),
  makeCmd(5, 'REGLEE', 5),
  makeCmd(6, 'ANNULEE', 6),
];

describe('CommandeListComponent', () => {
  let component: CommandeListComponent;
  let fixture: ComponentFixture<CommandeListComponent>;
  let serviceSpy: jasmine.SpyObj<CommandeService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let storeSpy: jasmine.SpyObj<Store>;
  let router: Router;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('CommandeService', ['getAll', 'annuler', 'changerStatut']);
    serviceSpy.getAll.and.returnValue(of(mockCommandes));
    serviceSpy.annuler.and.returnValue(of(makeCmd(1, 'ANNULEE')));
    serviceSpy.changerStatut.and.returnValue(of(makeCmd(2, 'PRET')));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [
        CommandeListComponent,
        IonicModule.forRoot(),
        RouterTestingModule,
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: CommandeService, useValue: serviceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CommandeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('charger() populates commandes and filteredCommandes', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.commandes.length).toBe(6);
    expect(component.filteredCommandes.length).toBe(6);
  }));

  it('charger() displays a danger toast on HTTP error', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('Network failure')));
    component.charger();
    tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('setViewMode() switches between kanban and list views', () => {
    component.setViewMode('list');
    expect(component.viewMode).toBe('list');
    component.setViewMode('kanban');
    expect(component.viewMode).toBe('kanban');
  });

  it('onSearchChange() filters orders by table number or cocktail name', fakeAsync(() => {
    component.charger();
    tick();
    component.onSearchChange({ detail: { value: 'Table 3' } });
    expect(component.filteredCommandes.length).toBe(1);
    expect(component.filteredCommandes[0].tableNumero).toBe(3);
  }));

  it('onToggleShowServed() updates showServed flag and reapplies filter', fakeAsync(() => {
    component.charger();
    tick();
    component.onToggleShowServed({ detail: { checked: true } });
    expect(component.showServed).toBeTrue();
  }));

  it('Kanban getters segregate orders correctly by status', fakeAsync(() => {
    component.charger();
    tick();
    expect(component.pendingOrders.length).toBe(1);
    expect(component.inProgressOrders.length).toBe(1);
    expect(component.readyOrders.length).toBe(1);
    expect(component.servedOrders.length).toBe(2);
  }));

  it('onUpdateStatus() calls service.changerStatut and refreshes list', fakeAsync(() => {
    component.onUpdateStatus(mockCommandes[1], 'PRET');
    tick();
    flushMicrotasks();
    expect(serviceSpy.changerStatut).toHaveBeenCalledWith(2, 'PRET');
    expect(serviceSpy.getAll).toHaveBeenCalledTimes(2);
  }));

  it('onAnnuler() calls service.annuler and refreshes list', fakeAsync(() => {
    component.onAnnuler(mockCommandes[0]);
    tick();
    flushMicrotasks();
    expect(serviceSpy.annuler).toHaveBeenCalledWith(1);
    expect(serviceSpy.getAll).toHaveBeenCalledTimes(2);
  }));

  it('isPriority() correctly identifies priority or overdue orders', () => {
    const overdueCmd = makeCmd(99, 'EN_ATTENTE', 1);
    overdueCmd.dateCommande = new Date(Date.now() - 20 * 60000).toISOString();
    expect(component.isPriority(overdueCmd)).toBeTrue();

    const vipCmd = makeCmd(98, 'EN_ATTENTE', 1, 'Note VIP Priority');
    expect(component.isPriority(vipCmd)).toBeTrue();
  });

  it('peutAnnuler() returns false for LIVREE, REGLEE, ANNULEE', () => {
    expect(component.peutAnnuler('LIVREE')).toBeFalse();
    expect(component.peutAnnuler('REGLEE')).toBeFalse();
    expect(component.peutAnnuler('ANNULEE')).toBeFalse();
    expect(component.peutAnnuler('EN_ATTENTE')).toBeTrue();
  });

  it('onView() navigates to /commandes/:id', () => {
    spyOn(router, 'navigate');
    component.onView(mockCommandes[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/commandes', 1]);
  });
});
