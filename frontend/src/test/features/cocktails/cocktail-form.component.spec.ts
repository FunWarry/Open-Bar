import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { CocktailFormComponent } from '../../../app/features/cocktails/cocktail-form/cocktail-form.component';
import { CocktailService } from '../../../app/core/services/cocktail.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { RecipeStepTemplateService } from '../../../app/core/services/recipe-step-template.service';
import { GlasswareService } from '../../../app/core/services/glassware.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { Glassware } from '../../../app/core/models/glassware.model';
import { RecipeStepTemplate } from '../../../app/core/models/recipe-step.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

const mockGlassware: Glassware[] = [
  {
    id: 1,
    nom: 'Verre Tumbler',
    contenanceCl: 35,
    imageUrl: 'assets/images/verres/verre_tumbler.png',
    description: 'Long drink glass',
    isPredefined: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    nom: 'Coupe Martini',
    contenanceCl: 18,
    imageUrl: 'assets/images/verres/verre_martini.png',
    isPredefined: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockCocktail: Cocktail = {
  id: 42,
  nom: 'Mojito',
  description: 'Cuban classic cocktail',
  prix: 9.5,
  categorie: 'ALCOOLISE',
  disponible: true,
  saisonnier: false,
  glassware: mockGlassware[0],
  glasswareId: 1,
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
  let glasswareServiceSpy: jasmine.SpyObj<GlasswareService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const toastMock = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };
  const modalMock = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(
      Promise.resolve({
        data: {
          nom: 'Virgin Mojito',
          description: 'Sans alcool',
          prixSupplement: 0,
          multiplicateurIngredient: 1.0,
          disponible: true,
          instructions: 'Shake with mint',
          ingredients: [
            {
              ingredientId: 1,
              ingredientNom: 'Mint Leaves',
              quantite: 8,
              unite: 'feuilles',
            },
          ],
        },
        role: 'confirm',
      })
    ),
  };

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
    glasswareServiceSpy = jasmine.createSpyObj('GlasswareService', ['getAll', 'create', 'uploadImage']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastMock as any));
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as any));

    ingredientServiceSpy.getAll.and.returnValue(of(mockIngredients));
    templateServiceSpy.getAll.and.returnValue(of(mockTemplates));
    glasswareServiceSpy.getAll.and.returnValue(of(mockGlassware));
    glasswareServiceSpy.create.and.returnValue(
      of({
        id: 3,
        nom: 'Verre Shot',
        contenanceCl: 5,
        imageUrl: 'assets/images/verres/verre_tumbler.png',
        isPredefined: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      })
    );
    glasswareServiceSpy.uploadImage.and.returnValue(
      of({
        id: 3,
        nom: 'Verre Shot',
        contenanceCl: 5,
        imageUrl: '/uploads/glassware/glassware_3_custom.png',
        isPredefined: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      })
    );
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
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: CocktailService, useValue: cocktailServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: RecipeStepTemplateService, useValue: templateServiceSpy },
        { provide: GlasswareService, useValue: glasswareServiceSpy },
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
      expect(component.glasswareList()).toHaveSize(2);
      expect(component.glasswareOptions()).toHaveSize(2);
    });

    it('should allow empty description in step 1', () => {
      component.cocktailForm.patchValue({
        name: 'Simple Drink',
        description: '', // Optional!
        price: 8.0,
        category: 'ALCOOLISE',
      });

      expect(component.isStep1Valid()).toBeTrue();
    });

    it('should prevent proceeding to step 2 when required fields are missing', () => {
      expect(component.currentStep()).toBe(1);
      expect(component.isStep1Valid()).toBeFalse();
      expect(component.canProceedFromCurrentStep()).toBeFalse();

      component.nextStep();
      expect(component.currentStep()).toBe(1); // Blocked
    });

    it('should navigate between wizard steps correctly when form data is valid', () => {
      expect(component.currentStep()).toBe(1);

      component.cocktailForm.patchValue({
        name: 'Margarita',
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

      component.prevStep();
      expect(component.currentStep()).toBe(3);

      component.goToStep(1);
      expect(component.currentStep()).toBe(1);
    });

    it('should manage modular recipe step blocks (add, reorder, delete)', () => {
      expect(component.recipeStepsArray).toHaveSize(0);

      component.addIngredientStep();
      expect(component.recipeStepsArray).toHaveSize(1);
      expect(component.recipeStepsArray.at(0).get('stepType')?.value).toBe('INGREDIENT');

      component.addActionTemplateStep();
      expect(component.recipeStepsArray).toHaveSize(2);
      expect(component.recipeStepsArray.at(1).get('stepType')?.value).toBe('ACTION_TEMPLATE');

      component.addCustomTextStep();
      expect(component.recipeStepsArray).toHaveSize(3);
      expect(component.recipeStepsArray.at(2).get('stepType')?.value).toBe('CUSTOM_TEXT');

      // Move step up
      component.moveStepUp(2);
      expect(component.recipeStepsArray.at(1).get('stepType')?.value).toBe('CUSTOM_TEXT');

      // Move step down
      component.moveStepDown(1);
      expect(component.recipeStepsArray.at(2).get('stepType')?.value).toBe('CUSTOM_TEXT');

      // Remove step
      component.removeRecipeStep(0);
      expect(component.recipeStepsArray).toHaveSize(2);
      expect(component.recipeStepsArray.at(0).get('stepOrder')?.value).toBe(1);
    });

    it('should handle ingredient and template selection events', () => {
      component.addIngredientStep();
      const group0 = component.getAsFormGroup(component.recipeStepsArray.at(0));
      component.onIngredientSelected(1, group0);
      expect(group0.get('ingredientId')?.value).toBe(1);
      expect(group0.get('ingredientNom')?.value).toBe('White Rum');
      expect(group0.get('unite')?.value).toBe('cl');

      component.addActionTemplateStep();
      const group1 = component.getAsFormGroup(component.recipeStepsArray.at(1));
      component.onTemplateSelected(2, group1);
      expect(group1.get('templateId')?.value).toBe(2);
      expect(group1.get('templateName')?.value).toBe('Muddle gently');
      expect(group1.get('actionType')?.value).toBe('MUDDLE');

      component.onModalActionTypeSelected('FLAME');
      expect(component.newTemplateActionType).toBe('FLAME');
    });

    it('should create new glassware from modal and select it', () => {
      component.openCreateGlasswareModal();
      expect(component.isNewGlasswareModalOpen()).toBeTrue();

      component.newGlasswareNom = 'Verre Shot';
      component.newGlasswareContenanceCl = 5;
      component.newGlasswareImageUrl = 'assets/images/verres/verre_tumbler.png';

      component.saveNewGlassware();
      expect(glasswareServiceSpy.create).toHaveBeenCalled();
      expect(component.glasswareList()).toHaveSize(3);
      expect(component.cocktailForm.get('glasswareId')?.value).toBe(3);
      expect(component.isNewGlasswareModalOpen()).toBeFalse();
    });

    it('should create custom glassware with uploaded image and select it', () => {
      component.openCreateGlasswareModal();
      component.setGlasswareSourceType('CUSTOM');
      expect(component.newGlasswareSourceType()).toBe('CUSTOM');

      component.newGlasswareNom = 'Custom Glass';
      component.newGlasswareContenanceCl = 25;
      const file = new File(['image data'], 'custom_glass.png', { type: 'image/png' });
      component.customGlasswareFile = file;

      component.saveNewGlassware();

      expect(glasswareServiceSpy.create).toHaveBeenCalled();
      expect(glasswareServiceSpy.uploadImage).toHaveBeenCalledWith(3, file);
      expect(component.glasswareList()).toHaveSize(3);
      expect(component.cocktailForm.get('glasswareId')?.value).toBe(3);
      expect(component.isNewGlasswareModalOpen()).toBeFalse();
    });

    it('should deduce required bar equipment dynamically based on recipe', () => {
      // Initially no equipment
      expect(component.deducedBarEquipment()).toHaveSize(0);

      // Select glassware
      component.cocktailForm.patchValue({ glasswareId: 1 });
      let equipment = component.deducedBarEquipment();
      expect(equipment.some((e) => e.name === 'Verre Tumbler' && e.category === 'GLASS')).toBeTrue();

      // Add ingredient step with measured quantity
      component.addIngredientStep();
      const ingGroup = component.getAsFormGroup(component.recipeStepsArray.at(0));
      ingGroup.patchValue({ quantite: 5 });
      equipment = component.deducedBarEquipment();
      expect(equipment.some((e) => e.name.includes('Jigger') && e.category === 'MEASURE')).toBeTrue();

      // Add SHAKE action template step
      component.addActionTemplateStep();
      const actionGroup = component.getAsFormGroup(component.recipeStepsArray.at(1));
      actionGroup.patchValue({ actionType: 'SHAKE' });
      equipment = component.deducedBarEquipment();
      expect(equipment.some((e) => e.name.includes('Shaker') && e.category === 'PREPARATION')).toBeTrue();
      expect(equipment.some((e) => e.name.includes('Passoire Hawthorne'))).toBeTrue();
    });

    it('should scale quantities properly when adjusting portions', () => {
      expect(component.previewPortions()).toBe(1);
      expect(component.getScaledQuantity(4)).toBe('4');

      component.incrementPortions();
      expect(component.previewPortions()).toBe(2);
      expect(component.getScaledQuantity(4)).toBe('8');

      component.incrementPortions();
      expect(component.previewPortions()).toBe(3);
      expect(component.getScaledQuantity(2.5)).toBe('7.5');

      component.decrementPortions();
      expect(component.previewPortions()).toBe(2);
    });

    it('should return appropriate icons for action types', () => {
      expect(component.getActionIcon('SHAKE')).toBe('sync-outline');
      expect(component.getActionIcon('STRAIN')).toBe('funnel-outline');
      expect(component.getActionIcon('MUDDLE')).toBe('hammer-outline');
      expect(component.getActionIcon('STIR')).toBe('wine-outline');
      expect(component.getActionIcon('ADD_ICE')).toBe('cube-outline');
      expect(component.getActionIcon('POUR')).toBe('water-outline');
      expect(component.getActionIcon('GARNISH')).toBe('leaf-outline');
      expect(component.getActionIcon('BLEND')).toBe('hardware-chip-outline');
      expect(component.getActionIcon('FLAME')).toBe('flame-outline');
      expect(component.getActionIcon('UNKNOWN')).toBe('sparkles-outline');
    });

    it('should manage variants (open modal to add, edit, remove)', async () => {
      expect(component.variantesArray).toHaveSize(0);
      await component.addVariant();
      expect(modalCtrlSpy.create).toHaveBeenCalled();
      expect(component.variantesArray).toHaveSize(1);
      expect(component.variantesArray.at(0).get('nom')?.value).toBe('Virgin Mojito');
      expect(component.variantesArray.at(0).get('ingredients')?.value).toHaveSize(1);

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
        glasswareId: 1,
      });
      component.addIngredientStep();
      const group = component.getAsFormGroup(component.recipeStepsArray.at(0));
      component.onIngredientSelected(1, group);

      component.onSubmit();
      await Promise.resolve();

      expect(cocktailServiceSpy.create).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/cocktails']);
    });
  });

  describe('edit mode (with id in route)', () => {
    beforeEach(async () => buildModule('42'));

    it('should load existing cocktail data, prefill glassware and recipeSteps', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.cocktailId).toBe(42);
      expect(component.cocktailForm.get('name')?.value).toBe('Mojito');
      expect(component.cocktailForm.get('glasswareId')?.value).toBe(1);
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

  describe('wizard navigation and validation', () => {
    beforeEach(async () => buildModule());

    it('should validate step 1 correctly', () => {
      expect(component.isStep1Valid()).toBeFalse();

      component.cocktailForm.patchValue({
        name: 'Gin Fizz',
        price: 8.5,
        category: 'ALCOOLISE',
      });
      expect(component.isStep1Valid()).toBeTrue();
    });

    it('should navigate between steps using nextStep and prevStep', () => {
      component.cocktailForm.patchValue({
        name: 'Gin Fizz',
        price: 8.5,
        category: 'ALCOOLISE',
      });

      expect(component.currentStep()).toBe(1);
      component.nextStep();
      expect(component.currentStep()).toBe(2);

      component.prevStep();
      expect(component.currentStep()).toBe(1);
    });

    it('should manage custom text steps and reorder them', () => {
      component.addIngredientStep();
      component.addCustomTextStep();
      expect(component.recipeStepsArray).toHaveSize(2);

      const customGroup = component.recipeStepsArray.at(1);
      expect(customGroup.get('stepType')?.value).toBe('CUSTOM_TEXT');

      component.moveStepUp(1);
      expect(component.recipeStepsArray.at(0).get('stepType')?.value).toBe('CUSTOM_TEXT');

      component.moveStepDown(0);
      expect(component.recipeStepsArray.at(1).get('stepType')?.value).toBe('CUSTOM_TEXT');

      component.removeStep(1);
      expect(component.recipeStepsArray).toHaveSize(1);
    });

    it('should manage variants correctly', async () => {
      expect(component.variantesArray).toHaveSize(0);

      await component.addVariant();
      expect(component.variantesArray).toHaveSize(1);

      component.variantesArray.at(0).patchValue({
        nom: 'Double shot',
        prixSupplement: 3.0,
      });

      expect(component.isStep3Valid()).toBeFalse(); // step 1 & 2 not valid yet

      component.cocktailForm.patchValue({
        name: 'Gin Tonic',
        price: 7.0,
        category: 'ALCOOLISE',
      });

      expect(component.isStep3Valid()).toBeTrue();

      component.removeVariant(0);
      expect(component.variantesArray).toHaveSize(0);
    });

    it('should scale preview portions and quantities', () => {
      expect(component.previewPortions()).toBe(1);

      component.incrementPortions();
      expect(component.previewPortions()).toBe(2);

      expect(component.getScaledQuantity(4)).toBe('8');
      expect(component.getScaledQuantity(2.5)).toBe('5');
      expect(component.getScaledQuantity(null)).toBe('-');

      component.decrementPortions();
      expect(component.previewPortions()).toBe(1);
      expect(component.getScaledQuantity(4)).toBe('4');
    });

    it('should deduce bar equipment for multiple action types', () => {
      component.addActionTemplateStep();
      const group0 = component.getAsFormGroup(component.recipeStepsArray.at(0));
      group0.patchValue({ stepType: 'ACTION_TEMPLATE', actionType: 'SHAKE', templateId: 1 });

      component.recipeVersion.update(v => v + 1);
      const equipment = component.deducedBarEquipment();
      expect(equipment.some(e => e.name.includes('Shaker'))).toBeTrue();
    });
  });
});
