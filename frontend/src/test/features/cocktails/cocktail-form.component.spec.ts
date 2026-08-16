import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { CocktailFormComponent } from '../../../app/features/cocktails/cocktail-form/cocktail-form.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { RecipeStepTemplateService } from '../../../app/core/services/recipe-step-template.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { RecipeStepTemplate } from '../../../app/core/models/recipe-step.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockCocktail: Cocktail = {
  id: 42,
  nom: 'Mojito',
  description: 'Cuban classic cocktail',
  prix: 9.5,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  ingredients: [],
  variantes: [],
  recipeSteps: [
    {
      id: 101,
      stepOrder: 1,
      stepType: 'INGREDIENT',
      ingredientId: 1,
      ingredientNom: 'White Rum',
      quantite: 5,
      unite: 'cl',
    },
    {
      id: 102,
      stepOrder: 2,
      stepType: 'ACTION_TEMPLATE',
      templateId: 1,
      templateName: 'Shake vigorously',
      actionType: 'SHAKE',
      durationSeconds: 15,
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockIngredients: Ingredient[] = [
  {
    id: 1,
    nom: 'White Rum',
    uniteMesure: 'cl',
    quantiteStock: 100,
    seuilAlerte: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    nom: 'Lime Juice',
    uniteMesure: 'cl',
    quantiteStock: 50,
    seuilAlerte: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockTemplates: RecipeStepTemplate[] = [
  {
    id: 1,
    name: 'Shake vigorously',
    actionType: 'SHAKE',
    defaultDurationSeconds: 15,
    predefined: true,
  },
  {
    id: 2,
    name: 'Muddle gently',
    actionType: 'MUDDLE',
    defaultDurationSeconds: 10,
    predefined: true,
  },
];

describe('CocktailFormComponent', () => {
  let component: CocktailFormComponent;
  let cocktailServiceSpy: jasmine.SpyObj<CocktailService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;
  let templateServiceSpy: jasmine.SpyObj<RecipeStepTemplateService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;

  const toastMock = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  const buildModule = async (routeId: string | null = null) => {
    cocktailServiceSpy = jasmine.createSpyObj('CocktailService', [
      'getAll',
      'getById',
      'create',
      'update',
      'delete',
      'toggleDisponibilite',
      'search',
      'getDisponibles',
      'updateSaisonnalite',
      'uploadImage',
    ]);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getAll']);
    templateServiceSpy = jasmine.createSpyObj('RecipeStepTemplateService', ['getAll', 'create']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock as any));

    ingredientServiceSpy.getAll.and.returnValue(of(mockIngredients));
    templateServiceSpy.getAll.and.returnValue(of(mockTemplates));
    templateServiceSpy.create.and.returnValue(
      of({
        id: 99,
        name: 'Flame zest',
        actionType: 'FLAME',
        defaultDurationSeconds: 5,
        predefined: false,
      })
    );

    cocktailServiceSpy.create.and.returnValue(of(mockCocktail as any));
    cocktailServiceSpy.update.and.returnValue(of(mockCocktail as any));
    cocktailServiceSpy.uploadImage.and.returnValue(of(mockCocktail as any));

    if (routeId) {
      cocktailServiceSpy.getById.and.returnValue(of(mockCocktail));
    }

    await TestBed.configureTestingModule({
      imports: [CocktailFormComponent, RouterTestingModule, getTranslocoTestingModule()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? routeId : null),
              },
            },
          },
        },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: RecipeStepTemplateService, useValue: templateServiceSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CocktailFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('creation mode (no id in route)', () => {
    beforeEach(async () => buildModule(null));

    it('should create the component and initialize signals', () => {
      expect(component).toBeTruthy();
      expect(component.isEditMode).toBeFalse();
      expect(component.currentStep()).toBe(1);
      expect(component.ingredientsList()).toHaveSize(2);
      expect(component.templatesList()).toHaveSize(2);
    });

    it('should prevent proceeding to step 2 when step 1 fields are empty or invalid', () => {
      expect(component.currentStep()).toBe(1);
      expect(component.isStep1Valid()).toBeFalse();
      expect(component.canProceedFromCurrentStep()).toBeFalse();

      component.nextStep();
      expect(component.currentStep()).toBe(1); // Blocked

      component.goToStep(2);
      expect(component.currentStep()).toBe(1); // Blocked
    });

    it('should navigate between wizard steps correctly when form data is valid', () => {
      expect(component.currentStep()).toBe(1);

      component.cocktailForm.patchValue({
        name: 'Margarita',
        description: 'Tequila based classic',
        price: 10.0,
        category: 'ALCOOLISE',
      });

      expect(component.isStep1Valid()).toBeTrue();
      expect(component.canProceedFromCurrentStep()).toBeTrue();

      component.nextStep();
      expect(component.currentStep()).toBe(2);

      component.nextStep();
      expect(component.currentStep()).toBe(3);

      component.nextStep();
      expect(component.currentStep()).toBe(4);

      component.nextStep();
      expect(component.currentStep()).toBe(4); // capped at totalSteps

      component.prevStep();
      expect(component.currentStep()).toBe(3);

      component.goToStep(1);
      expect(component.currentStep()).toBe(1); // Allowed backward
    });

    it('should manage modular recipe step blocks (add, reorder, delete)', () => {
      expect(component.recipeStepsArray).toHaveSize(0);

      component.addIngredientBlock();
      expect(component.recipeStepsArray).toHaveSize(1);
      expect(component.recipeStepsArray.at(0).get('stepType')?.value).toBe('INGREDIENT');

      component.addActionTemplateBlock(mockTemplates[0]);
      expect(component.recipeStepsArray).toHaveSize(2);
      expect(component.recipeStepsArray.at(1).get('stepType')?.value).toBe('ACTION_TEMPLATE');
      expect(component.recipeStepsArray.at(1).get('templateName')?.value).toBe('Shake vigorously');

      component.addCustomTextBlock();
      expect(component.recipeStepsArray).toHaveSize(3);
      expect(component.recipeStepsArray.at(2).get('stepType')?.value).toBe('CUSTOM_TEXT');

      // Move last step up
      component.moveStepUp(2);
      expect(component.recipeStepsArray.at(1).get('stepType')?.value).toBe('CUSTOM_TEXT');

      // Move step down
      component.moveStepDown(1);
      expect(component.recipeStepsArray.at(2).get('stepType')?.value).toBe('CUSTOM_TEXT');

      // Remove step
      component.removeStep(0);
      expect(component.recipeStepsArray).toHaveSize(2);
      expect(component.recipeStepsArray.at(0).get('stepOrder')?.value).toBe(1);
    });

    it('should handle ingredient and template selection events', () => {
      component.addIngredientBlock();
      component.onIngredientOptionSelected(0, { value: 1, label: 'White Rum' });
      const step0 = component.recipeStepsArray.at(0);
      expect(step0.get('ingredientId')?.value).toBe(1);
      expect(step0.get('ingredientNom')?.value).toBe('White Rum');
      expect(step0.get('unite')?.value).toBe('cl');

      component.addActionTemplateBlock();
      component.onTemplateOptionSelected(1, { value: 2, label: 'Muddle gently' });
      const step1 = component.recipeStepsArray.at(1);
      expect(step1.get('templateId')?.value).toBe(2);
      expect(step1.get('templateName')?.value).toBe('Muddle gently');
      expect(step1.get('actionType')?.value).toBe('MUDDLE');

      component.onModalActionTypeSelected({ value: 'FLAME', label: 'Flamber' });
      expect(component.newTemplateActionType).toBe('FLAME');
    });

    it('should scale quantities properly when adjusting portions', () => {
      expect(component.previewPortions()).toBe(1);
      expect(component.getScaledQuantity(4)).toBe(4);

      component.incrementPortions();
      expect(component.previewPortions()).toBe(2);
      expect(component.getScaledQuantity(4)).toBe(8);

      component.incrementPortions();
      expect(component.previewPortions()).toBe(3);
      expect(component.getScaledQuantity(2.5)).toBe(7.5);

      component.decrementPortions();
      expect(component.previewPortions()).toBe(2);
    });

    it('should return appropriate icons for action types', () => {
      expect(component.getActionIcon('SHAKE')).toBe('wine-outline');
      expect(component.getActionIcon('STRAIN')).toBe('funnel-outline');
      expect(component.getActionIcon('MUDDLE')).toBe('hammer-outline');
      expect(component.getActionIcon('STIR')).toBe('sync-outline');
      expect(component.getActionIcon('ADD_ICE')).toBe('cube-outline');
      expect(component.getActionIcon('POUR')).toBe('water-outline');
      expect(component.getActionIcon('GARNISH')).toBe('leaf-outline');
      expect(component.getActionIcon('BLEND')).toBe('hardware-chip-outline');
      expect(component.getActionIcon('FLAME')).toBe('flame-outline');
      expect(component.getActionIcon('UNKNOWN')).toBe('sparkles-outline');
    });

    it('should manage variants (add, remove)', () => {
      expect(component.variantesArray).toHaveSize(0);
      component.addVariant();
      expect(component.variantesArray).toHaveSize(1);
      component.removeVariant(0);
      expect(component.variantesArray).toHaveSize(0);
    });

    it('should create new action template from modal', () => {
      component.openCreateTemplateModal();
      expect(component.isNewTemplateModalOpen()).toBeTrue();

      component.newTemplateName = 'Flame zest';
      component.newTemplateActionType = 'FLAME';
      component.newTemplateDuration = 5;

      component.saveNewTemplate();
      expect(templateServiceSpy.create).toHaveBeenCalled();
      expect(component.templatesList()).toHaveSize(3);
      expect(component.isNewTemplateModalOpen()).toBeFalse();
    });

    it('should submit valid cocktail with recipe steps and navigate to /cocktails', async () => {
      component.cocktailForm.patchValue({
        name: 'Daiquiri',
        description: 'Rum, lime and simple syrup',
        price: 9.0,
        category: 'ALCOOLISE',
        instructions: 'Shake with ice and strain into coupe glass',
      });
      component.addIngredientBlock();

      component.onSubmit();
      await Promise.resolve();

      expect(cocktailServiceSpy.create).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cocktails']);
    });
  });

  describe('edit mode (with id in route)', () => {
    beforeEach(async () => buildModule('42'));

    it('should load existing cocktail data and prefill recipeSteps', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.cocktailId).toBe(42);
      expect(component.cocktailForm.get('name')?.value).toBe('Mojito');
      expect(component.recipeStepsArray).toHaveSize(2);
      expect(component.recipeStepsArray.at(0).get('ingredientNom')?.value).toBe('White Rum');
    });

    it('should submit update with modified steps and navigate', async () => {
      component.recipeStepsArray.at(0).patchValue({ quantite: 6 });
      component.onSubmit();
      await Promise.resolve();

      expect(cocktailServiceSpy.update).toHaveBeenCalledWith(42, jasmine.any(Object));
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cocktails']);
    });
  });
});
