import { TestBed, ComponentFixture, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { CommandeDetailModalComponent } from '../../../app/features/commandes/commande-detail-modal/commande-detail-modal.component';
import { CommandeService } from '../../../app/core/services/commande.service';
import { Commande } from '../../../app/core/models/commande.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockCommande: Commande = {
  id: 9,
  tableId: 3,
  tableNumero: 3,
  serveurId: 2,
  serveurUsername: 'serveur2',
  items: [
    { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 3.47 },
  ],
  statut: 'EN_ATTENTE',
  total: 6.94,
  dateCommande: '2026-08-06T17:29:00',
  notes: 'Table VIP',
  createdAt: '',
  updatedAt: '',
};

describe('CommandeDetailModalComponent', () => {
  let component: CommandeDetailModalComponent;
  let fixture: ComponentFixture<CommandeDetailModalComponent>;
  let commandeServiceSpy: jasmine.SpyObj<CommandeService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertSpy: jasmine.SpyObj<HTMLIonAlertElement>;

  const mockToast = { present: jasmine.createSpy('present') };

  beforeEach(async () => {
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['getById', 'changerStatut', 'annuler', 'toggleUrgent']);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss', 'create']);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    alertSpy = jasmine.createSpyObj('HTMLIonAlertElement', ['present']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertSpy));

    commandeServiceSpy.getById.and.returnValue(of(mockCommande));
    commandeServiceSpy.changerStatut.and.returnValue(of({ ...mockCommande, statut: 'EN_PREPARATION' }));
    commandeServiceSpy.annuler.and.returnValue(of({ ...mockCommande, statut: 'ANNULEE' }));
    commandeServiceSpy.toggleUrgent.and.returnValue(of({ ...mockCommande, prioritaire: true }));

    await TestBed.configureTestingModule({
      imports: [
        CommandeDetailModalComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommandeDetailModalComponent);
    component = fixture.componentInstance;
    component.commandeId = 9;
    component.commandeInput = mockCommande;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groupedItems aggregates identical order items', () => {
    expect(component.groupedItems).toHaveSize(1);
    expect(component.groupedItems[0].cocktailNom).toBe('Mojito');
  });

  it('getItemLineTotal calculates item total correctly', () => {
    expect(component.getItemLineTotal(component.groupedItems[0])).toBe(6.94);
  });

  it('peutAnnuler() returns true for active status', () => {
    expect(component.peutAnnuler()).toBeTrue();
  });

  it('onUpdateStatus changes status and dismisses modal with statusUpdated role', fakeAsync(() => {
    component.onUpdateStatus('EN_PREPARATION');
    tick();
    flushMicrotasks();
    expect(commandeServiceSpy.changerStatut).toHaveBeenCalledWith(9, 'EN_PREPARATION');
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      role: 'statusUpdated',
      commande: jasmine.objectContaining({ statut: 'EN_PREPARATION' }),
      targetStatut: 'EN_PREPARATION',
    });
  }));

  it('onAnnuler presents confirmation modal and cancels when confirmed', async () => {
    modalCtrlSpy.create.and.returnValue(Promise.resolve({
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve({ role: 'confirm', data: { confirmed: true } })
    } as any));

    await component.onAnnuler();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(commandeServiceSpy.annuler).toHaveBeenCalledWith(9);
  });

  it('getTotalCommande calculates fallback item sum when total is 0', () => {
    const cmdWithZero = {
      id: 1,
      total: 0,
      items: [
        { id: 1, quantite: 2, prixUnitaire: 5.0, cocktailNom: 'Mojito' },
        { id: 2, quantite: 1, prixUnitaire: 8.0, cocktailNom: 'Gin Tonic' }
      ]
    } as any;
    expect(component.getTotalCommande(cmdWithZero)).toBe(18.0);
    expect(component.getTotalCommande(null)).toBe(0);
    expect(component.getTotalCommande({ id: 2, total: 42.0 } as any)).toBe(42.0);
    expect(component.getTotalCommande({ id: 3, total: 0, items: [] } as any)).toBe(0);
  });

  it('onToggleUrgent toggles order priority and presents toast', fakeAsync(() => {
    component.onToggleUrgent();
    tick();
    expect(commandeServiceSpy.toggleUrgent).toHaveBeenCalledWith(9);
    expect(component.commande?.prioritaire).toBeTrue();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'warning' }));
  }));

  it('onToggleUrgent presents medium toast when order is unmarked as urgent', fakeAsync(() => {
    commandeServiceSpy.toggleUrgent.and.returnValue(of({ id: 9, prioritaire: false } as Commande));
    component.onToggleUrgent();
    tick();
    expect(component.commande?.prioritaire).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'medium' }));
  }));

  it('onToggleUrgent does nothing when commande is null', () => {
    component.commande = null as any;
    component.onToggleUrgent();
    expect(commandeServiceSpy.toggleUrgent).not.toHaveBeenCalled();
  });

  it('onToggleUrgent displays danger toast on error', fakeAsync(() => {
    commandeServiceSpy.toggleUrgent.and.returnValue(throwError(() => new Error('Service error')));
    component.onToggleUrgent();
    tick();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ color: 'danger' }));
  }));

  it('totalArticlesCount correctly sums item quantities and handles empty states', () => {
    component.commande = {
      id: 1,
      items: [
        { id: 1, quantite: 3, prixUnitaire: 5.0, cocktailNom: 'Mojito' },
        { id: 2, quantite: 2, prixUnitaire: 8.0, cocktailNom: 'Gin Tonic' },
        { id: 3, quantite: 2, prixUnitaire: 6.0, cocktailNom: 'Nachos' },
      ],
    } as any;
    expect(component.totalArticlesCount).toBe(7);

    component.commande = { id: 2, items: [] } as any;
    expect(component.totalArticlesCount).toBe(0);

    component.commande = null as any;
    expect(component.totalArticlesCount).toBe(0);
  });

  it('peutModifier returns true only for EN_ATTENTE or EN_PREPARATION', () => {
    component.commande = { id: 1, statut: 'EN_ATTENTE' } as any;
    expect(component.peutModifier()).toBeTrue();

    component.commande = { id: 1, statut: 'EN_PREPARATION' } as any;
    expect(component.peutModifier()).toBeTrue();

    component.commande = { id: 1, statut: 'PRET' } as any;
    expect(component.peutModifier()).toBeFalse();

    component.commande = { id: 1, statut: 'LIVREE' } as any;
    expect(component.peutModifier()).toBeFalse();
  });

  it('hasTable returns true when tableId or tableNumero is present', () => {
    component.commande = { id: 1, tableId: 5 } as any;
    expect(component.hasTable).toBeTrue();

    component.commande = { id: 2, tableNumero: 3 } as any;
    expect(component.hasTable).toBeTrue();

    component.commande = { id: 3, barTabId: 2, barTabNom: 'Client VIP' } as any;
    expect(component.hasTable).toBeFalse();
  });

  it('onModifierCommande opens EditCommandeModalComponent and refreshes if updated', fakeAsync(() => {
    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({ data: { updated: true } })),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));
    component.commandeId = 1;
    component.commande = { id: 1, statut: 'EN_ATTENTE' } as any;

    component.onModifierCommande();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(commandeServiceSpy.getById).toHaveBeenCalledWith(1);
  }));

  it('onVoirTable opens TableDetailModalComponent when table is present', fakeAsync(() => {
    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));
    component.commande = { id: 1, tableNumero: 4, tableId: 10 } as any;

    component.onVoirTable();
    tick();

    expect(modalCtrlSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        componentProps: jasmine.objectContaining({
          table: jasmine.objectContaining({ id: 10, nom: 'Table 4' }),
        }),
      })
    );
  }));
});

