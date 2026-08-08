import { TestBed, ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
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
  notes: 'Sans glaçons',
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
        IonicModule.forRoot(),
        getTranslocoTestingModule(),
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

  it('onAnnuler() emits annuler event', () => {
    spyOn(component.annuler, 'emit');
    component.onAnnuler();
    expect(component.annuler.emit).toHaveBeenCalledWith(mockCmd);
  });

  it('onUpdateStatus() emits updateStatus event', () => {
    spyOn(component.updateStatus, 'emit');
    component.onUpdateStatus('EN_PREPARATION');
    expect(component.updateStatus.emit).toHaveBeenCalledWith({
      commande: mockCmd,
      targetStatut: 'EN_PREPARATION',
    });
  });
});
