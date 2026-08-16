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
      { id: 1, ingredientId: 101, ingredientNom: 'Lemon Juice', quantite: 2, uniteMesure: 'cl' },
      { id: 2, ingredientId: 102, ingredientNom: 'Angostura', quantite: 1, uniteMesure: 'cl' },
    ],
    recipeSteps: [
      {
        id: 1,
        stepOrder: 1,
        stepType: 'INGREDIENT',
        ingredientId: 101,
        ingredientNom: 'Lemon Juice',
        quantite: 2,
        unite: 'cl',
      },
      {
        id: 2,
        stepOrder: 2,
        stepType: 'ACTION_TEMPLATE',
        templateId: 1,
        templateName: 'Shake vigorously',
        actionType: 'SHAKE',
        durationSeconds: 15,
      },
    ],
    variantes: [],
    instructions: 'Put all ingredients in shaker. Shake vigorously. Steam heat. Serve in a mug.',
    createdAt: '',
    updatedAt: '',
  };

  const mockItem: CommandeItemView = {
    id: 100,
    cocktailId: 10,
    cocktailNom: 'Aulp',
    quantite: 2,
    prioritaire: false,
    varianteNom: 'Spicy',
    notes: 'Serve hot',
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
    items: [mockItem],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSidePanelComponent, CommonModule, getTranslocoTestingModule()],
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

  it('should return item quantity or 1 by default', () => {
    expect(component.quantity).toBe(2);

    component.item = null;
    expect(component.quantity).toBe(1);
  });

  it('should calculate scaled total dosages correctly', () => {
    component.item = mockItem; // quantity = 2
    expect(component.getTotalDosage(2)).toBe(4);
    expect(component.getTotalDosage(1)).toBe(2);
    expect(component.getTotalDosage(8)).toBe(16);
  });

  it('should calculate scaled recipe step quantities', () => {
    component.item = mockItem; // quantity = 2
    expect(component.getScaledStepQuantity(2)).toBe(4);
    expect(component.getScaledStepQuantity(0.5)).toBe(1);
    expect(component.getScaledStepQuantity(null)).toBe(0);
  });

  it('should return matching icon for action types', () => {
    expect(component.getActionIcon('SHAKE')).toBe('wine-outline');
    expect(component.getActionIcon('STRAIN')).toBe('funnel-outline');
    expect(component.getActionIcon('MUDDLE')).toBe('hammer-outline');
    expect(component.getActionIcon('STIR')).toBe('sync-outline');
    expect(component.getActionIcon('ADD_ICE')).toBe('cube-outline');
    expect(component.getActionIcon('POUR')).toBe('water-outline');
    expect(component.getActionIcon('GARNISH')).toBe('leaf-outline');
    expect(component.getActionIcon('BLEND')).toBe('hardware-chip-outline');
    expect(component.getActionIcon('FLAME')).toBe('flame-outline');
    expect(component.getActionIcon('OTHER')).toBe('sparkles-outline');
  });

  it('should emit closePanel on onClose', () => {
    let closed = false;
    component.closePanel.subscribe(() => {
      closed = true;
    });

    component.onClose();
    expect(closed).toBeTrue();
  });

  it('should trigger onClose on Escape press when open', () => {
    let closed = false;
    component.closePanel.subscribe(() => {
      closed = true;
    });

    component.onEscapePress();
    expect(closed).toBeTrue();
  });
});
