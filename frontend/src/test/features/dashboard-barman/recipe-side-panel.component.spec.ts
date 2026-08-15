import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RecipeSidePanelComponent } from '../../../app/features/dashboard-barman/components/recipe-side-panel/recipe-side-panel.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { CommandeView, CommandeItemView } from '../../../app/features/dashboard-barman/models/commande-view.model';

describe('RecipeSidePanelComponent', () => {
  let component: RecipeSidePanelComponent;
  let fixture: ComponentFixture<RecipeSidePanelComponent>;

  const mockCocktail: Cocktail = {
    id: 10,
    nom: 'Aulp',
    prix: 9.0,
    categorie: 'SPECIAL',
    disponible: true,
    saisonnier: false,
    ingredients: [
      { id: 1, ingredientId: 101, ingredientNom: 'Jus de Citron jaune', quantite: 2, uniteMesure: 'cl' },
      { id: 2, ingredientId: 102, ingredientNom: 'Angostura', quantite: 1, uniteMesure: 'cl' },
      { id: 3, ingredientId: 103, ingredientNom: 'Sirop de Canelle', quantite: 1, uniteMesure: 'cl' },
      { id: 4, ingredientId: 104, ingredientNom: 'Jus de Raisin', quantite: 8, uniteMesure: 'cl' }
    ],
    variantes: [],
    instructions: 'Mettre tous les ingrédients dans le shaker. Shaker vigoureusement. Chauffer à la vapeur. Servir dans une tasse.',
    createdAt: '',
    updatedAt: ''
  };

  const mockItem: CommandeItemView = {
    id: 100,
    cocktailId: 10,
    cocktailNom: 'Aulp',
    quantite: 2,
    prioritaire: false,
    varianteNom: 'Épicée',
    notes: 'Servir bien chaud'
  };

  const mockCommande: CommandeView = {
    id: 9,
    tableNom: 'Table 33',
    tableNumero: 33,
    serveurNom: 'serveur2',
    serveurUsername: 'serveur2',
    statut: 'EN_ATTENTE',
    prioritaire: false,
    dateCommande: new Date(),
    items: [mockItem]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSidePanelComponent, CommonModule, getTranslocoTestingModule()]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeSidePanelComponent);
    component = fixture.componentInstance;
    component.item = mockItem;
    component.commande = mockCommande;
    component.cocktail = mockCocktail;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('quantity renvoie la quantite de l item ou 1 par defaut', () => {
    expect(component.quantity).toBe(2);

    component.item = null;
    expect(component.quantity).toBe(1);
  });

  it('getTotalDosage calcule correctement les dosages multiplies', () => {
    component.item = mockItem; // quantity = 2
    expect(component.getTotalDosage(2)).toBe(4);
    expect(component.getTotalDosage(1)).toBe(2);
    expect(component.getTotalDosage(8)).toBe(16);
  });

  it('onClose emet closePanel', () => {
    let closed = false;
    component.closePanel.subscribe(() => {
      closed = true;
    });

    component.onClose();
    expect(closed).toBeTrue();
  });

  it('handleEscapeKey declenche onClose si le panneau est ouvert', () => {
    let closed = false;
    component.closePanel.subscribe(() => {
      closed = true;
    });

    component.isOpen = true;
    component.handleEscapeKey();
    expect(closed).toBeTrue();

    // If closed, does not emit
    closed = false;
    component.isOpen = false;
    component.handleEscapeKey();
    expect(closed).toBeFalse();
  });
});
