import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { CancelOrderModalComponent } from '../../../../app/core/components/ui/cancel-order-modal/cancel-order-modal.component';
import { Commande } from '../../../../app/core/models/commande.model';

describe('CancelOrderModalComponent', () => {
  let component: CancelOrderModalComponent;
  let fixture: ComponentFixture<CancelOrderModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockCommande: Commande = {
    id: 7,
    tableId: 10,
    tableNumero: 10,
    serveurId: 2,
    serveurUsername: 'john_doe',
    statut: 'EN_ATTENTE',
    dateCommande: '2026-08-28T12:00:00Z',
    total: 25.5,
    notes: 'Table VIP - sans paille',
    createdAt: '',
    updatedAt: '',
    items: [
      {
        id: 101,
        cocktailId: 1,
        cocktailNom: 'Mojito',
        varianteNom: 'Grand Format',
        quantite: 2,
        prixUnitaire: 8.5
      },
      {
        id: 102,
        cocktailId: 1,
        cocktailNom: 'Mojito',
        varianteNom: 'Grand Format',
        quantite: 1,
        prixUnitaire: 8.5
      },
      {
        id: 103,
        cocktailId: 2,
        cocktailNom: 'Cosmopolitan',
        quantite: 1,
        prixUnitaire: 8.5
      }
    ]
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [
        CancelOrderModalComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              'COMMANDES.CONFIRM_CANCEL_TITLE': "Confirmer l'annulation",
              'COMMANDES.CONFIRM_CANCEL_REASONS.MISTAKE': 'Erreur de saisie',
              'COMMANDES.CONFIRM_CANCEL_REASONS.CUSTOMER_CANCEL': "Changement d'avis client",
              'COMMANDES.CONFIRM_CANCEL_REASONS.OUT_OF_STOCK': "Rupture d'ingrédient",
              'COMMANDES.CONFIRM_CANCEL_REASONS.DELAY': "Délai d'attente trop long",
              'COMMANDES.CONFIRM_CANCEL_REASONS.OTHER': 'Autre motif',
              'COMMANDES.CONFIRM_CANCEL_KEEP': 'Non, conserver la commande',
              'COMMANDES.CONFIRM_CANCEL_OK': 'Oui, annuler la commande'
            }
          },
          translocoConfig: {
            availableLangs: ['fr'],
            defaultLang: 'fr'
          }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CancelOrderModalComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve metadata from input commande object', () => {
    component.commande = mockCommande;
    fixture.detectChanges();

    expect(component.resolvedId()).toBe(7);
    expect(component.resolvedTable()).toBe(10);
    expect(component.resolvedServer()).toBe('john_doe');
    expect(component.resolvedTotal()).toBe(25.5);
    expect(component.resolvedNotes()).toBe('Table VIP - sans paille');
  });

  it('should resolve metadata from fallback direct inputs', () => {
    component.commande = null;
    component.commandeId = 42;
    component.tableNumero = 'Bar 3';
    component.serveurUsername = 'alice';
    component.total = 12.0;
    component.notes = 'Express';
    fixture.detectChanges();

    expect(component.resolvedId()).toBe(42);
    expect(component.resolvedTable()).toBe('Bar 3');
    expect(component.resolvedServer()).toBe('alice');
    expect(component.resolvedTotal()).toBe(12.0);
    expect(component.resolvedNotes()).toBe('Express');
  });

  it('should group identical items correctly', () => {
    component.commande = mockCommande;
    fixture.detectChanges();

    const grouped = component.groupedItems();
    expect(grouped).toHaveSize(2);

    const mojito = grouped.find(g => g.cocktailNom === 'Mojito');
    expect(mojito).toBeDefined();
    expect(mojito?.quantite).toBe(3); // 2 + 1
    expect(mojito?.prixTotal).toBe(25.5);

    const cosmo = grouped.find(g => g.cocktailNom === 'Cosmopolitan');
    expect(cosmo).toBeDefined();
    expect(cosmo?.quantite).toBe(1);
  });

  it('should update reason when setReason is called', () => {
    expect(component.selectedReasonKey()).toBe('MISTAKE');

    component.setReason('OUT_OF_STOCK');
    expect(component.selectedReasonKey()).toBe('OUT_OF_STOCK');
  });

  it('should dismiss modal with cancel status when dismissCancel is called', () => {
    component.dismissCancel();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      { confirmed: false },
      'cancel'
    );
  });

  it('should confirm cancellation with selected reason and custom notes', () => {
    component.setReason('CUSTOMER_CANCEL');
    component.customReason.set('Client parti');

    component.confirmCancel();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining({
        confirmed: true,
        reason: jasmine.stringMatching(/Client parti/)
      }),
      'confirm'
    );
  });

  it('should handle empty items array gracefully', () => {
    component.commande = {
      ...mockCommande,
      items: []
    };
    fixture.detectChanges();

    expect(component.groupedItems()).toEqual([]);
  });
});
