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

const makeCmd = (id: number, statut: Commande['statut']): Commande => ({
  id, tableId: 1, tableNumero: 1, serveurId: 1, serveurUsername: 'alice',
  items: [], statut, total: 10, dateCommande: '', createdAt: '', updatedAt: '',
});

const mockCommandes: Commande[] = [
  makeCmd(1, 'EN_ATTENTE'),
  makeCmd(2, 'EN_PREPARATION'),
  makeCmd(3, 'PRET'),
  makeCmd(4, 'ANNULEE'),
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
    serviceSpy = jasmine.createSpyObj('CommandeService', ['getAll', 'annuler']);
    serviceSpy.getAll.and.returnValue(of(mockCommandes));
    serviceSpy.annuler.and.returnValue(of(makeCmd(1, 'ANNULEE') as any));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [CommandeListComponent, IonicModule.forRoot(), RouterTestingModule],
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

  it('charger() peuple commandes et filteredCommandes', fakeAsync(() => {
    component.charger(); tick();
    expect(component.commandes.length).toEqual(4);
    expect(component.filteredCommandes.length).toEqual(4);
  }));

  it('charger() affiche un toast danger en cas d\'erreur', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('err')));
    component.charger(); tick();
    flushMicrotasks();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('onFiltreChange() filtre par statut', fakeAsync(() => {
    component.charger(); tick();
    component.onFiltreChange({ detail: { value: 'EN_ATTENTE' } });
    expect(component.filteredCommandes.every(c => c.statut === 'EN_ATTENTE')).toBeTrue();
    expect(component.filteredCommandes.length).toEqual(1);
  }));

  it('onFiltreChange("TOUTES") retourne toutes les commandes', fakeAsync(() => {
    component.charger(); tick();
    component.onFiltreChange({ detail: { value: 'EN_ATTENTE' } });
    component.onFiltreChange({ detail: { value: 'TOUTES' } });
    expect(component.filteredCommandes.length).toEqual(4);
  }));

  it('peutAnnuler() retourne false pour LIVREE/REGLEE/ANNULEE', () => {
    expect(component.peutAnnuler('LIVREE')).toBeFalse();
    expect(component.peutAnnuler('REGLEE')).toBeFalse();
    expect(component.peutAnnuler('ANNULEE')).toBeFalse();
  });

  it('peutAnnuler() retourne true pour EN_ATTENTE et EN_PREPARATION', () => {
    expect(component.peutAnnuler('EN_ATTENTE')).toBeTrue();
    expect(component.peutAnnuler('EN_PREPARATION')).toBeTrue();
  });

  it('getStatutColor() mappe correctement les statuts', () => {
    expect(component.getStatutColor('EN_ATTENTE')).toBe('warning');
    expect(component.getStatutColor('PRET')).toBe('success');
    expect(component.getStatutColor('ANNULEE')).toBe('danger');
    expect(component.getStatutColor('INCONNU')).toBe('primary');
  });

  it('onView() navigue vers /commandes/:id', () => {
    spyOn(router, 'navigate');
    component.onView(mockCommandes[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/commandes', 1]);
  });

  it('onAnnuler() appelle CommandeService.annuler et recharge', fakeAsync(() => {
    component.onAnnuler(mockCommandes[0]);
    tick();
    flushMicrotasks();
    expect(serviceSpy.annuler).toHaveBeenCalledWith(1);
    expect(serviceSpy.getAll).toHaveBeenCalledTimes(2);
  }));

  it('trackById retourne l\'id de la commande', () => {
    expect(component.trackById(0, mockCommandes[0])).toBe(1);
  });
});
