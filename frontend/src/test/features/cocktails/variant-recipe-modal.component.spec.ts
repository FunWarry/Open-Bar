import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { VariantRecipeModalComponent } from '../../../app/features/cocktails/components/variant-recipe-modal/variant-recipe-modal.component';
import {
  CocktailVariante,
} from '../../../app/core/models/cocktail.model';
import {
  CocktailRecipeStep,
  RecipeStepTemplate,
} from '../../../app/core/models/recipe-step.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockBaseRecipeSteps: CocktailRecipeStep[] = [
  {
    stepOrder: 1,
    stepType: 'INGREDIENT',
    ingredientId: 10,
    ingredientNom: 'White Rum',
    quantite: 5,
    unite: 'cl',
    customText: 'Fond du verre',
  },
  {
    stepOrder: 2,
    stepType: 'INGREDIENT',
    ingredientId: 11,
    ingredientNom: 'Lime Juice',
    quantite: 3,
    unite: 'cl',
    customText: '',
  },
  {
    stepOrder: 3,
    stepType: 'ACTION_TEMPLATE',
    templateId: 100,
    templateName: 'Shaker vigoureusement',
    actionType: 'SHAKE',
    durationSeconds: 15,
    customText: 'Avec des glaçons',
  },
];

const mockCatalogIngredients: Ingredient[] = [
  {
    id: 10,
    nom: 'White Rum',
    uniteMesure: 'cl',
    quantiteStock: 100,
    seuilAlerte: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 11,
    nom: 'Lime Juice',
    uniteMesure: 'cl',
    quantiteStock: 50,
    seuilAlerte: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 20,
    nom: 'Botanical Spirit 0%',
    uniteMesure: 'cl',
    quantiteStock: 30,
    seuilAlerte: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockCatalogTemplates: RecipeStepTemplate[] = [
  {
    id: 100,
    name: 'Shaker vigoureusement',
    actionType: 'SHAKE',
    defaultDurationSeconds: 15,
    predefined: true,
  },
  {
    id: 101,
    name: 'Filtrer au chinois',
    actionType: 'STRAIN',
    defaultDurationSeconds: 10,
    predefined: true,
  },
];

describe('VariantRecipeModalComponent', () => {
  let component: VariantRecipeModalComponent;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [VariantRecipeModalComponent, getTranslocoTestingModule()],
      providers: [{ provide: ModalController, useValue: modalCtrlSpy }],
    }).compileComponents();

    const fixture = TestBed.createComponent(VariantRecipeModalComponent);
    component = fixture.componentInstance;
    component.baseCocktailName = 'Mojito';
    component.baseCocktailPrice = 8.5;
    component.baseRecipeSteps = mockBaseRecipeSteps;
    component.availableIngredients = mockCatalogIngredients;
    component.availableTemplates = mockCatalogTemplates;
  });

  it('should create and inherit base recipe steps in creation mode', () => {
    component.variante = null;
    component.ngOnInit();

    expect(component).toBeTruthy();
    expect(component.nom).toBe('');
    expect(component.recipeSteps).toHaveSize(3);
    expect(component.recipeSteps[0].ingredientNom).toBe('White Rum');
    expect(component.recipeSteps[0].quantite).toBe(5);
    expect(component.totalVolume).toBe(8);
    expect(component.effectivePrice).toBe(8.5);
    expect(component.ingredientCount).toBe(2);
  });

  it('should load existing variant data with custom recipe steps in edit mode', () => {
    const existingVar: CocktailVariante = {
      id: 55,
      nom: 'Virgin Mojito',
      description: 'Without alcohol',
      prixSupplement: 1.5,
      multiplicateurIngredient: 1.0,
      disponible: true,
      instructions: 'Use non-alcoholic spirit',
      recipeSteps: [
        {
          stepOrder: 1,
          stepType: 'INGREDIENT',
          ingredientId: 20,
          ingredientNom: 'Botanical Spirit 0%',
          quantite: 6,
          unite: 'cl',
        },
      ],
    };

    component.variante = existingVar;
    component.ngOnInit();

    expect(component.id).toBe(55);
    expect(component.nom).toBe('Virgin Mojito');
    expect(component.prixSupplement).toBe(1.5);
    expect(component.effectivePrice).toBe(10.0);
    expect(component.recipeSteps).toHaveSize(1);
    expect(component.recipeSteps[0].ingredientId).toBe(20);
    expect(component.recipeSteps[0].quantite).toBe(6);
  });

  it('should allow adding ingredient, template, and custom text steps', () => {
    component.variante = null;
    component.ngOnInit();

    const initialCount = component.recipeSteps.length;
    component.addIngredientStep();
    expect(component.recipeSteps).toHaveSize(initialCount + 1);
    expect(component.recipeSteps[component.recipeSteps.length - 1].stepType).toBe('INGREDIENT');

    component.addActionTemplateStep();
    expect(component.recipeSteps).toHaveSize(initialCount + 2);
    expect(component.recipeSteps[component.recipeSteps.length - 1].stepType).toBe('ACTION_TEMPLATE');

    component.addCustomTextStep();
    expect(component.recipeSteps).toHaveSize(initialCount + 3);
    expect(component.recipeSteps[component.recipeSteps.length - 1].stepType).toBe('CUSTOM_TEXT');
  });

  it('should allow moving steps up and down and removing a step', () => {
    component.variante = null;
    component.ngOnInit();

    expect(component.recipeSteps[0].ingredientNom).toBe('White Rum');
    expect(component.recipeSteps[1].ingredientNom).toBe('Lime Juice');

    component.moveStepDown(0);
    expect(component.recipeSteps[0].ingredientNom).toBe('Lime Juice');
    expect(component.recipeSteps[1].ingredientNom).toBe('White Rum');
    expect(component.recipeSteps[0].stepOrder).toBe(1);
    expect(component.recipeSteps[1].stepOrder).toBe(2);

    component.moveStepUp(1);
    expect(component.recipeSteps[0].ingredientNom).toBe('White Rum');

    component.removeStep(0);
    expect(component.recipeSteps).toHaveSize(2);
    expect(component.recipeSteps[0].ingredientNom).toBe('Lime Juice');
  });

  it('should apply multiplier to all ingredient steps', () => {
    component.variante = null;
    component.ngOnInit();

    expect(component.recipeSteps[0].quantite).toBe(5);
    expect(component.recipeSteps[1].quantite).toBe(3);

    component.applyMultiplier(2.0);
    expect(component.recipeSteps[0].quantite).toBe(10);
    expect(component.recipeSteps[1].quantite).toBe(6);
    expect(component.multiplicateurIngredient).toBe(2.0);
  });

  it('should reset steps back to base recipe', () => {
    component.variante = null;
    component.ngOnInit();

    component.removeStep(0);
    component.removeStep(0);
    expect(component.recipeSteps).toHaveSize(1);

    component.resetToBaseRecipe();
    expect(component.recipeSteps).toHaveSize(3);
    expect(component.recipeSteps[0].ingredientNom).toBe('White Rum');
  });

  it('should update step on ingredient and template selection', () => {
    component.variante = null;
    component.ngOnInit();

    component.onIngredientSelected(0, { value: 20 });
    expect(component.recipeSteps[0].ingredientId).toBe(20);
    expect(component.recipeSteps[0].ingredientNom).toBe('Botanical Spirit 0%');

    component.onTemplateSelected(2, { value: 101 });
    expect(component.recipeSteps[2].templateId).toBe(101);
    expect(component.recipeSteps[2].templateName).toBe('Filtrer au chinois');
    expect(component.recipeSteps[2].actionType).toBe('STRAIN');
  });

  it('should save standard variant with empty recipeSteps when recipe is identical to base', () => {
    component.variante = null;
    component.ngOnInit();
    component.nom = 'Standard With Surcharge';
    component.prixSupplement = 2.0;

    component.save();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining({
        nom: 'Standard With Surcharge',
        prixSupplement: 2.0,
        disponible: true,
        ingredients: [],
        recipeSteps: undefined,
      }),
      'confirm'
    );
  });

  it('should save customized variant and extract ingredients when recipe differs from base', () => {
    component.variante = null;
    component.ngOnInit();
    component.nom = 'Double Rum Edition';
    component.prixSupplement = 2.0;

    // Modify ingredient quantity to customize recipe
    component.recipeSteps[0].quantite = 10;

    component.save();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(
      jasmine.objectContaining({
        nom: 'Double Rum Edition',
        prixSupplement: 2.0,
        disponible: true,
        ingredients: jasmine.arrayContaining([
          jasmine.objectContaining({ ingredientId: 10, quantite: 10 }),
          jasmine.objectContaining({ ingredientId: 11, quantite: 3 }),
        ]),
        recipeSteps: jasmine.any(Array),
      }),
      'confirm'
    );
  });

  it('should not save when variant name is empty', () => {
    component.variante = null;
    component.ngOnInit();
    component.nom = '   ';

    component.save();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
  });

  it('should return correct action icons for different action types', () => {
    expect(component.getActionIcon('SHAKE')).toBe('sync-outline');
    expect(component.getActionIcon('STRAIN')).toBe('funnel-outline');
    expect(component.getActionIcon('MUDDLE')).toBe('hammer-outline');
    expect(component.getActionIcon('STIR')).toBe('wine-outline');
    expect(component.getActionIcon('ADD_ICE')).toBe('cube-outline');
    expect(component.getActionIcon('POUR')).toBe('water-outline');
    expect(component.getActionIcon('GARNISH')).toBe('leaf-outline');
    expect(component.getActionIcon('BLEND')).toBe('hardware-chip-outline');
    expect(component.getActionIcon('FLAME')).toBe('flame-outline');
    expect(component.getActionIcon(null)).toBe('sparkles-outline');
  });

  it('should correctly detect if recipe is customized vs identical to base', () => {
    component.variante = null;
    component.ngOnInit();
    expect(component.checkIfRecipeIsCustomized()).toBeFalse();

    component.recipeSteps[0].quantite = 99;
    expect(component.checkIfRecipeIsCustomized()).toBeTrue();

    component.resetToBaseRecipe();
    expect(component.checkIfRecipeIsCustomized()).toBeFalse();

    component.removeStep(0);
    expect(component.checkIfRecipeIsCustomized()).toBeTrue();
  });

  it('should handle selecting non-existing ingredient or template gracefully', () => {
    component.variante = null;
    component.ngOnInit();

    const origIngId = component.recipeSteps[0].ingredientId;
    component.onIngredientSelected(0, { value: 99999 });
    expect(component.recipeSteps[0].ingredientId).toBe(origIngId);

    const origTplId = component.recipeSteps[2].templateId;
    component.onTemplateSelected(2, { value: 99999 });
    expect(component.recipeSteps[2].templateId).toBe(origTplId);
  });

  it('should ignore non-positive multipliers', () => {
    component.variante = null;
    component.ngOnInit();

    const qty = component.recipeSteps[0].quantite;
    component.applyMultiplier(0);
    expect(component.recipeSteps[0].quantite).toBe(qty);

    component.applyMultiplier(-1);
    expect(component.recipeSteps[0].quantite).toBe(qty);
  });

  it('should calculate effectivePrice, totalVolume, and ingredientCount correctly', () => {
    component.baseCocktailPrice = 10;
    component.prixSupplement = 2.5;
    component.variante = null;
    component.ngOnInit();

    expect(component.effectivePrice).toBe(12.5);
    expect(component.ingredientCount).toBe(2);
    expect(component.totalVolume).toBe(8); // 5cl + 3cl
  });

  it('should initialize correctly when editing variant with existing recipeSteps', () => {
    component.variante = {
      id: 55,
      nom: 'Existing Steps Variant',
      description: 'Custom steps description',
      prixSupplement: 1.0,
      multiplicateurIngredient: 1.0,
      disponible: true,
      instructions: 'Custom notes',
      ingredients: [],
      recipeSteps: [
        { stepOrder: 1, stepType: 'CUSTOM_TEXT', actionTitle: 'Direct Step', durationSeconds: 5 }
      ]
    };
    component.ngOnInit();

    expect(component.id).toBe(55);
    expect(component.nom).toBe('Existing Steps Variant');
    expect(component.recipeSteps).toHaveSize(1);
    expect(component.recipeSteps[0].actionTitle).toBe('Direct Step');
  });

  it('should reorder steps with moveStepUp and moveStepDown respecting boundaries', () => {
    component.variante = null;
    component.ngOnInit();

    expect(component.recipeSteps[0].stepOrder).toBe(1);
    expect(component.recipeSteps[1].stepOrder).toBe(2);

    // Boundary top
    component.moveStepUp(0);
    expect(component.recipeSteps[0].stepOrder).toBe(1);

    // Move step 1 up
    const firstStepNom = component.recipeSteps[0].ingredientNom;
    component.moveStepUp(1);
    expect(component.recipeSteps[0].ingredientNom).not.toBe(firstStepNom);

    // Boundary bottom
    const lastIdx = component.recipeSteps.length - 1;
    component.moveStepDown(lastIdx);
    expect(component.recipeSteps).toHaveSize(3);

    // Move step down
    component.moveStepDown(0);
    expect(component.recipeSteps[0].ingredientNom).toBe(firstStepNom);
  });

  it('should add ingredient, template, and custom text steps', () => {
    component.variante = null;
    component.ngOnInit();
    const initialCount = component.recipeSteps.length;

    component.addIngredientStep();
    expect(component.recipeSteps).toHaveSize(initialCount + 1);
    expect(component.recipeSteps[initialCount].stepType).toBe('INGREDIENT');

    component.addActionTemplateStep();
    expect(component.recipeSteps).toHaveSize(initialCount + 2);
    expect(component.recipeSteps[initialCount + 1].stepType).toBe('ACTION_TEMPLATE');

    component.addCustomTextStep();
    expect(component.recipeSteps).toHaveSize(initialCount + 3);
    expect(component.recipeSteps[initialCount + 2].stepType).toBe('CUSTOM_TEXT');
  });

  it('should provide computed ingredientOptions and templateOptions', () => {
    expect(component.ingredientOptions().length).toBeGreaterThan(0);
    expect(component.templateOptions().length).toBeGreaterThan(0);
  });

  it('should cancel and dismiss with null', () => {
    component.cancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should return currency symbol from appSettingsService', () => {
    expect(component.currencySymbol).toBe('€');
  });
});
