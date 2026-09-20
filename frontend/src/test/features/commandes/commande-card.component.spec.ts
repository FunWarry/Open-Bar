import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { CommandeCardComponent } from '../../../app/features/commandes/commande-card/commande-card.component';
import { Commande } from '../../../app/core/models/commande.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockCmd: Commande = {
  id: 1,
  tableId: 1,
  tableNumero: 5,
  serveurId: 2,
  serveurUsername: 'bob',
  items: [{ id: 10, cocktailId: 1, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 9.5 }],
  statut: 'EN_ATTENTE',
  total: 19,
  dateCommande: new Date(Date.now() - 5 * 60000).toISOString(),
  notes: 'No ice',
  createdAt: '',
  updatedAt: '',
};

describe('CommandeCardComponent', () => {
  let component: CommandeCardComponent;
  let fixture: ComponentFixture<CommandeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommandeCardComponent,
        getTranslocoTestingModule(),
      ],
      providers: [
        provideIonicAngular(),
        ModalController,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommandeCardComponent);
    component = fixture.componentInstance;
    component.commande = mockCmd;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isPriority() detects priority orders', () => {
    const priorityCmd = { ...mockCmd, notes: 'Commande VIP Retard' };
    component.commande = priorityCmd;
    expect(component.isPriority()).toBeTrue();
  });

  it('peutAnnuler() returns true for EN_ATTENTE', () => {
    expect(component.peutAnnuler()).toBeTrue();
  });

  it('onView() emits view event', () => {
    spyOn(component.view, 'emit');
    component.onView();
    expect(component.view.emit).toHaveBeenCalledWith(mockCmd);
  });

  it('onAnnuler() presents confirmation modal and emits annuler event', fakeAsync(() => {
    spyOn(component.annuler, 'emit');
    const modalCtrl = TestBed.inject(ModalController);
    spyOn(modalCtrl, 'create').and.returnValue(Promise.resolve({
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve({ role: 'confirm', data: { confirmed: true } }),
    } as any));

    component.onAnnuler();
    tick();
    expect(modalCtrl.create).toHaveBeenCalled();
    expect(component.annuler.emit).toHaveBeenCalledWith(mockCmd);
  }));

  it('groupedItems aggregates identical items and sums quantities', () => {
    const multiCmd: Commande = {
      ...mockCmd,
      items: [
        { id: 1, cocktailId: 1, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 10.22 },
        { id: 2, cocktailId: 1, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 10.22 },
        { id: 3, cocktailId: 2, cocktailNom: 'Negroni', quantite: 1, prixUnitaire: 9.15 },
      ],
    };
    component.commande = multiCmd;
    expect(component.groupedItems).toHaveSize(2);
    expect(component.groupedItems[0].quantite).toBe(2);
    expect(component.groupedItems[0].cocktailNom).toBe('Mojito');
    expect(component.getItemLineTotal(component.groupedItems[0])).toBe(20.44);
  });

  it('onUpdateStatus() emits updateStatus event', () => {
    spyOn(component.updateStatus, 'emit');
    component.onUpdateStatus('EN_PREPARATION');
    expect(component.updateStatus.emit).toHaveBeenCalledWith({
      commande: mockCmd,
      targetStatut: 'EN_PREPARATION',
    });
  });

  it('tableLabel returns formatted label for all combinations', () => {
    component.commande = { ...mockCmd, tableNumero: 10, barTabNom: 'VIP Dupont' };
    expect(component.tableLabel).toBe('Table 10 • VIP Dupont');

    component.commande = { ...mockCmd, tableNumero: 10, barTabNom: undefined };
    expect(component.tableLabel).toBe('Table 10');

    component.commande = { ...mockCmd, tableNumero: undefined, barTabNom: 'VIP Dupont' };
    expect(component.tableLabel).toBe('VIP Dupont (Bar)');

    component.commande = { ...mockCmd, tableNumero: undefined, barTabNom: undefined };
    expect(component.tableLabel).toBe('Bar');

    component.commande = null as any;
    expect(component.tableLabel).toBe('');
  });

  it('isPriority() handles prioritaire flag, late delay and null safely', () => {
    component.commande = { ...mockCmd, prioritaire: true, notes: undefined };
    expect(component.isPriority()).toBeTrue();

    component.commande = { ...mockCmd, prioritaire: false, notes: undefined, dateCommande: new Date().toISOString() };
    expect(component.isPriority()).toBeFalse();

    component.commande = null as any;
    expect(component.isPriority()).toBeFalse();
  });

  it('computes delay and urgency thresholds correctly', () => {
    // Normal / recent
    component.commande = { ...mockCmd, dateCommande: new Date().toISOString(), prioritaire: false, notes: undefined };
    expect(component.isCritical).toBeFalse();
    expect(component.isUrgent).toBeFalse();
    expect(component.isWarning).toBeFalse();

    // Warning (5 to 10 min)
    component.commande = { ...mockCmd, dateCommande: new Date(Date.now() - 6 * 60000).toISOString(), prioritaire: false, notes: undefined };
    expect(component.isWarning).toBeTrue();
    expect(component.isUrgent).toBeFalse();

    // Urgent (10 to 15 min or priority)
    component.commande = { ...mockCmd, dateCommande: new Date(Date.now() - 11 * 60000).toISOString(), prioritaire: false, notes: undefined };
    expect(component.isUrgent).toBeTrue();
    expect(component.isCritical).toBeFalse();

    // Critical (>= 15 min)
    component.commande = { ...mockCmd, dateCommande: new Date(Date.now() - 16 * 60000).toISOString(), prioritaire: false, notes: undefined };
    expect(component.isCritical).toBeTrue();

    // Delivered / Settled / Cancelled orders never show urgency
    component.commande = { ...mockCmd, statut: 'LIVREE', dateCommande: new Date(Date.now() - 30 * 60000).toISOString() };
    expect(component.isCritical).toBeFalse();
    expect(component.isUrgent).toBeFalse();
    expect(component.isWarning).toBeFalse();
  });

  it('returns appropriate lisereColor according to status and urgency', () => {
    component.commande = { ...mockCmd, statut: 'EN_ATTENTE', dateCommande: new Date().toISOString(), prioritaire: false, notes: undefined };
    expect(component.lisereColor).toBe('var(--semantic-warning)');

    component.commande = { ...mockCmd, statut: 'EN_PREPARATION', dateCommande: new Date().toISOString(), prioritaire: false, notes: undefined };
    expect(component.lisereColor).toBe('var(--semantic-info)');

    component.commande = { ...mockCmd, statut: 'PRET', dateCommande: new Date().toISOString(), prioritaire: false, notes: undefined };
    expect(component.lisereColor).toBe('var(--semantic-success)');

    component.commande = { ...mockCmd, statut: 'LIVREE' };
    expect(component.lisereColor).toBe('var(--text-muted)');

    component.commande = { ...mockCmd, statut: 'REGLEE' };
    expect(component.lisereColor).toBe('var(--text-muted)');

    component.commande = { ...mockCmd, statut: 'ANNULEE' };
    expect(component.lisereColor).toBe('var(--text-muted)');

    // Urgent overrides status color
    component.commande = { ...mockCmd, statut: 'EN_PREPARATION', prioritaire: true };
    expect(component.lisereColor).toBe('var(--semantic-danger)');

    component.commande = null as any;
    expect(component.lisereColor).toBe('var(--border-medium)');
  });
});
