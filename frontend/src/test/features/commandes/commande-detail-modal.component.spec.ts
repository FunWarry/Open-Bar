import { TestBed, ComponentFixture } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ModalController, AlertController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
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
  let alertSpy: jasmine.SpyObj<HTMLIonAlertElement>;

  beforeEach(async () => {
    commandeServiceSpy = jasmine.createSpyObj('CommandeService', ['getById', 'changerStatut', 'annuler']);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);

    alertSpy = jasmine.createSpyObj('HTMLIonAlertElement', ['present']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertSpy));

    commandeServiceSpy.getById.and.returnValue(of(mockCommande));
    commandeServiceSpy.changerStatut.and.returnValue(of({ ...mockCommande, statut: 'EN_PREPARATION' }));
    commandeServiceSpy.annuler.and.returnValue(of({ ...mockCommande, statut: 'ANNULEE' }));

    await TestBed.configureTestingModule({
      imports: [
        CommandeDetailModalComponent,
        IonicModule.forRoot(),
        getTranslocoTestingModule(),
      ],
      providers: [
        { provide: CommandeService, useValue: commandeServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
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

  it('onUpdateStatus changes status and dismisses modal with statusUpdated role', () => {
    component.onUpdateStatus('EN_PREPARATION');
    expect(commandeServiceSpy.changerStatut).toHaveBeenCalledWith(9, 'EN_PREPARATION');
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      role: 'statusUpdated',
      commande: jasmine.objectContaining({ statut: 'EN_PREPARATION' }),
      targetStatut: 'EN_PREPARATION',
    });
  });

  it('onAnnuler presents confirmation alert', async () => {
    await component.onAnnuler();
    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertSpy.present).toHaveBeenCalled();
  });
});
