import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { CommandeCardComponent } from '../../../app/features/dashboard-barman/components/commande-card/commande-card.component';
import { CommandeView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';

const makeCommande = (overrides: Partial<CommandeView> = {}): CommandeView => ({
  id: 1,
  tableNom: 'Table 1',
  tableNumero: 1,
  serveurNom: 'Alice',
  serveurUsername: 'alice',
  statut: 'EN_ATTENTE',
  prioritaire: false,
  dateCommande: new Date(),
  items: [
    {
      id: 10,
      cocktailId: 101,
      cocktailNom: 'Mojito',
      quantite: 2,
      prioritaire: false,
      varianteNom: 'Fraise',
      notes: 'Crushed ice'
    }
  ],
  ...overrides
});

describe('CommandeCardComponent', () => {
  let component: CommandeCardComponent;
  let fixture: ComponentFixture<CommandeCardComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;

  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: null }))
  };

  const mockCocktail: Cocktail = {
    id: 101,
    nom: 'Mojito',
    prix: 8.5,
    categorie: 'ALCOOLISE',
    disponible: true,
    saisonnier: false,
    ingredients: [
      { id: 1, ingredientId: 1, ingredientNom: 'Rhum', quantite: 4, uniteMesure: 'cl' }
    ],
    variantes: [],
    instructions: 'Piler la menthe et ajouter le rhum.',
    createdAt: '',
    updatedAt: ''
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', ['getCocktailById']);
    dashboardServiceSpy.getCocktailById.and.returnValue(of(mockCocktail));

    await TestBed.configureTestingModule({
      imports: [CommandeCardComponent, CommonModule, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandeCardComponent);
    component = fixture.componentInstance;
    component.commande = makeCommande();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('tempsEcoule calcule les minutes et secondes', () => {
    const past = new Date(Date.now() - 65 * 1000); // 1 min 05s ago
    component.commande = makeCommande({ dateCommande: past });
    (component as any).updateTimer();
    expect(component.tempsEcoule).toBe('01:05');
  });

  it('tempsEcoule affiche les heures si depasse 60 minutes', () => {
    const past = new Date(Date.now() - 75 * 60 * 1000); // 1h15 ago
    component.commande = makeCommande({ dateCommande: past });
    (component as any).updateTimer();
    expect(component.tempsEcoule).toBe('1h15');
  });

  it('evalue isUrgent et isWarning selon les seuils', () => {
    component.tempsAlerteCommandeMinutes = 5;

    // Normal (< 3 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 2 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isWarning).toBeFalse();
    expect(component.isUrgent).toBeFalse();

    // Warning (3-5 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 4 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isWarning).toBeTrue();
    expect(component.isUrgent).toBeFalse();

    // Urgent (>= 5 min)
    component.commande = makeCommande({ dateCommande: new Date(Date.now() - 6 * 60 * 1000) });
    (component as any).updateTimer();
    expect(component.isUrgent).toBeTrue();
  });

  it('lisereColor renvoie la bonne couleur de statut', () => {
    component.isUrgent = false;
    component.commande = makeCommande({ statut: 'EN_ATTENTE' });
    expect(component.lisereColor).toBe('var(--semantic-warning)');

    component.commande = makeCommande({ statut: 'EN_PREPARATION' });
    expect(component.lisereColor).toBe('var(--semantic-info)');

    component.commande = makeCommande({ statut: 'PRET' });
    expect(component.lisereColor).toBe('var(--semantic-success)');

    component.isUrgent = true;
    expect(component.lisereColor).toBe('var(--semantic-danger)');
  });

  it('onPrendreEnCharge emet changerStatut avec statut EN_PREPARATION', () => {
    const emitted: { id: number; statut: string }[] = [];
    component.changerStatut.subscribe(val => emitted.push(val));
    component.commande = makeCommande({ id: 42 });
    component.onPrendreEnCharge();

    expect(emitted).toEqual([{ id: 42, statut: 'EN_PREPARATION' }]);
  });

  it('onMarquerPret emet changerStatut avec statut PRET', () => {
    const emitted: { id: number; statut: string }[] = [];
    component.changerStatut.subscribe(val => emitted.push(val));
    component.commande = makeCommande({ id: 7 });
    component.onMarquerPret();

    expect(emitted).toEqual([{ id: 7, statut: 'PRET' }]);
  });

  it('onPrintTicket emet printTicket', () => {
    const emitted: CommandeView[] = [];
    component.printTicket.subscribe(cmd => emitted.push(cmd));

    component.onPrintTicket();
    expect(emitted).toHaveSize(1);
    expect(emitted[0].id).toBe(1);
  });

  it('openDetails ouvre CommandeDetailModalComponent', async () => {
    await component.openDetails();
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(mockModal.present).toHaveBeenCalled();
  });

  it('onOpenRecipe emet showRecipe avec l item et la commande', () => {
    const emitted: { item: any; commande: CommandeView }[] = [];
    component.showRecipe.subscribe(val => emitted.push(val));
    const item = component.groupedItems[0];

    component.onOpenRecipe(item);
    expect(emitted).toHaveSize(1);
    expect(emitted[0].item.cocktailNom).toBe('Mojito');
    expect(emitted[0].commande.id).toBe(1);
  });

  it('timer se met a jour chaque seconde', fakeAsync(() => {
    component.commande = makeCommande({ dateCommande: new Date() });
    component.ngOnInit();
    tick(2000);
    expect(component.tempsEcoule).toMatch(/\d{2}:\d{2}/);
    component.ngOnDestroy();
  }));
});
