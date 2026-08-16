import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { AlertController } from '@ionic/angular/standalone';
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

  it('onAnnuler() presents confirmation alert or emits annuler event', fakeAsync(() => {
    spyOn(component.annuler, 'emit');
    const alertCtrl = TestBed.inject(AlertController);
    let handlerFn: (() => void) | undefined;
    spyOn(alertCtrl, 'create').and.callFake((options: any) => {
      handlerFn = options.buttons.find((b: any) => b.handler)?.handler;
      return Promise.resolve({ present: () => Promise.resolve() } as any);
    });

    component.onAnnuler();
    tick();
    expect(alertCtrl.create).toHaveBeenCalled();
    if (handlerFn) handlerFn();
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
});
