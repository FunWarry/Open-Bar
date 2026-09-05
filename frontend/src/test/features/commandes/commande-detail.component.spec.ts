import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { CommandeDetailComponent } from '../../../app/features/commandes/commande-detail/commande-detail.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { Commande } from '../../../app/core/models/commande.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockCommande: Commande = {
  id: 42, tableId: 1, tableNumero: 1, serveurId: 1, serveurUsername: 'alice',
  items: [
    { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 8 },
    { id: 2, cocktailId: 1, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 8 },
  ],
  statut: 'EN_ATTENTE', total: 16,
  dateCommande: '2024-06-01T10:00:00Z', createdAt: '', updatedAt: '',
};

describe('CommandeDetailComponent', () => {
  let component: CommandeDetailComponent;
  let serviceSpy: jasmine.SpyObj<CommandeService>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('CommandeService', ['getById', 'annuler']);
    serviceSpy.getById.and.returnValue(of(mockCommande));
    serviceSpy.annuler.and.returnValue(of({ ...mockCommande, statut: 'ANNULEE' } as Commande));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CommandeDetailComponent, IonicModule.forRoot(), RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '42' } } } },
        { provide: Router, useValue: routerSpy },
        { provide: CommandeService, useValue: serviceSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CommandeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => expect(component).toBeTruthy());

  it('ngOnInit() charge la commande depuis le service', fakeAsync(() => {
    component.ngOnInit(); tick();
    expect(component.commande).toEqual(mockCommande);
  }));

  it('groupedItems cumule les articles identiques', fakeAsync(() => {
    component.ngOnInit(); tick();
    expect(component.groupedItems).toHaveSize(1);
    expect(component.groupedItems[0].quantite).toBe(2);
    expect(component.getItemLineTotal(component.groupedItems[0])).toBe(16);
  }));

  it('ngOnInit() navigates to /commandes if getById fails', fakeAsync(() => {
    serviceSpy.getById.and.returnValue(throwError(() => new Error('err')));
    component.ngOnInit(); tick();
    flushMicrotasks();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
  }));

  it('getStatutColor() mappe EN_ATTENTE → warning', () => {
    expect(component.getStatutColor('EN_ATTENTE')).toBe('warning');
  });

  it('getStatutColor() mappe PRET → success', () => {
    expect(component.getStatutColor('PRET')).toBe('success');
  });

  it('getStatutColor() mappe ANNULEE → danger', () => {
    expect(component.getStatutColor('ANNULEE')).toBe('danger');
  });

  it('peutAnnuler() retourne true si statut EN_ATTENTE', fakeAsync(() => {
    component.ngOnInit(); tick();
    expect(component.peutAnnuler()).toBeTrue();
  }));

  it('peutAnnuler() retourne false si commande null', () => {
    component.commande = null;
    expect(component.peutAnnuler()).toBeFalse();
  });

  it('onAnnuler() calls annuler() and updates order', fakeAsync(() => {
    component.ngOnInit(); tick();
    component.onAnnuler();
    tick();
    flushMicrotasks();
    expect(serviceSpy.annuler).toHaveBeenCalledWith(42);
    expect(component.commande?.statut).toBe('ANNULEE');
  }));

  it('onBack() navigue vers /commandes', () => {
    component.onBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/commandes']);
  });
});
