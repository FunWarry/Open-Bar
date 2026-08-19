import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import {
  RecipeSidePanelComponent,
  BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY,
} from '../../../app/features/dashboard-barman/components/recipe-side-panel/recipe-side-panel.component';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Glassware } from '../../../app/core/models/glassware.model';
import { CommandeView, CommandeItemView } from '../../../app/features/dashboard-barman/models/commande-view.model';
import { SimpleChange } from '@angular/core';

describe('RecipeSidePanelComponent', () => {
  let component: RecipeSidePanelComponent;
  let fixture: ComponentFixture<RecipeSidePanelComponent>;

  const mockGlassware: Glassware = {
    id: 1,
    nom: 'Verre Tumbler / Highball',
    contenanceCl: 35,
    imageUrl: 'assets/images/verres/verre_tumbler.png',
    description: 'Idéal pour les Long Drinks avec glaçons.',
    isPredefined: true,
    createdAt: '',
    updatedAt: '',
  };

  const mockCocktail: Cocktail = {
    id: 10,
    nom: 'Mojito Royal',
    prix: 9.5,
    categorie: 'SPECIAL',
    disponible: true,
    saisonnier: false,
    glassware: mockGlassware,
    glasswareId: 1,
    ingredients: [
      { id: 1, ingredientId: 101, ingredientNom: 'Rhum Blanc', quantite: 5, uniteMesure: 'cl' },
      { id: 2, ingredientId: 102, ingredientNom: 'Jus de Citron Vert', quantite: 3, uniteMesure: 'cl' },
      { id: 3, ingredientId: 101, ingredientNom: 'Rhum Blanc', quantite: 1, uniteMesure: 'cl' }, // Duplicate for deduplication test
    ],
    recipeSteps: [
      {
        id: 1,
        stepOrder: 1,
        stepType: 'INGREDIENT',
        ingredientId: 101,
        ingredientNom: 'Rhum Blanc',
        quantite: 6,
        unite: 'cl',
        customText: 'Verser dans le verre de service.',
      },
      {
        id: 2,
        stepOrder: 2,
        stepType: 'ACTION_TEMPLATE',
        templateId: 1,
        templateName: 'Piler la menthe fraîche',
        actionType: 'MUDDLE',
        durationSeconds: 15,
        customText: 'Piler délicatement sans broyer les feuilles.',
      },
      {
        id: 3,
        stepOrder: 3,
        stepType: 'ACTION_TEMPLATE',
        templateId: 2,
        templateName: 'Shaker vigoureusement',
        actionType: 'SHAKE',
        durationSeconds: 12,
      },
      {
        id: 4,
        stepOrder: 4,
        stepType: 'ACTION_TEMPLATE',
        templateId: 3,
        templateName: 'Garnir & Dresser',
        actionType: 'GARNISH',
        durationSeconds: 5,
        customText: 'Bouquet de menthe fraîche et zeste de citron vert.',
      },
      {
        id: 5,
        stepOrder: 5,
        stepType: 'CUSTOM_TEXT',
        actionTitle: 'Finishing Touch',
        customText: 'Ajouter une paille écologique en bambou.',
        durationSeconds: 3,
      },
    ],
    variantes: [],
    instructions: 'Préparer et servir immédiatement.',
    createdAt: '',
    updatedAt: '',
  };

  const mockItem: CommandeItemView = {
    id: 100,
    cocktailId: 10,
    cocktailNom: 'Mojito Royal',
    quantite: 2,
    prioritaire: true,
    varianteNom: 'Extra Menthe',
    notes: 'Bien frais sans sucre ajouté',
  };

  const mockCommande: CommandeView = {
    id: 42,
    tableNom: 'Terrasse 4',
    tableNumero: 4,
    serveurNom: 'Mathéo',
    serveurUsername: 'matheo',
    statut: 'EN_PREPARATION',
    prioritaire: true,
    dateCommande: new Date(),
    items: [mockItem],
  };

  beforeEach(async () => {
    localStorage.removeItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY);

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

  afterEach(() => {
    localStorage.removeItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Quantity & Scaling', () => {
    it('should return item quantity or 1 by default', () => {
      expect(component.quantity).toBe(2);

      component.item = null;
      expect(component.quantity).toBe(1);
    });

    it('should calculate scaled total dosages correctly', () => {
      component.item = mockItem; // quantity = 2
      expect(component.getTotalDosage(5)).toBe(10);
      expect(component.getTotalDosage(1.5)).toBe(3);
      expect(component.getTotalDosage(0.33)).toBe(0.66);
    });

    it('should calculate scaled recipe step quantities', () => {
      component.item = mockItem; // quantity = 2
      expect(component.getScaledStepQuantity(6)).toBe(12);
      expect(component.getScaledStepQuantity(0.5)).toBe(1);
      expect(component.getScaledStepQuantity(null)).toBe(0);
      expect(component.getScaledStepQuantity(undefined)).toBe(0);
    });
  });

  describe('View Mode & LocalStorage Persistence', () => {
    it('should default to full view mode if no preference in localStorage', () => {
      expect(component.viewMode).toBe('full');
    });

    it('should restore compact view mode if saved in localStorage', () => {
      localStorage.setItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY, 'compact');
      component.restoreViewModePreference();
      expect(component.viewMode).toBe('compact');
    });

    it('should set view mode and persist it in localStorage', () => {
      component.setViewMode('compact');
      expect(component.viewMode).toBe('compact');
      expect(localStorage.getItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY)).toBe('compact');

      component.setViewMode('full');
      expect(component.viewMode).toBe('full');
      expect(localStorage.getItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY)).toBe('full');
    });

    it('should gracefully handle invalid localStorage values', () => {
      localStorage.setItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY, 'invalid_mode');
      component.restoreViewModePreference();
      expect(component.viewMode).toBe('full');
    });

    it('should filter visible steps to only ingredients in compact mode', () => {
      component.viewMode = 'compact';
      const steps = component.visibleRecipeSteps;
      expect(steps).toHaveSize(1);
      expect(steps[0].stepType).toBe('INGREDIENT');
      expect(steps[0].ingredientNom).toBe('Rhum Blanc');
    });

    it('should return all steps in full mode', () => {
      component.viewMode = 'full';
      const steps = component.visibleRecipeSteps;
      expect(steps).toHaveSize(5);
    });
  });

  describe('Glassware & Presentation Resolution', () => {
    it('should resolve glassware from cocktail entity', () => {
      expect(component.resolvedGlassware).toEqual(mockGlassware);
    });

    it('should return null when cocktail has no glassware', () => {
      component.cocktail = { ...mockCocktail, glassware: undefined };
      expect(component.resolvedGlassware).toBeNull();
    });

    it('should extract garnish from GARNISH recipe step', () => {
      expect(component.resolvedGarnish).toBe(
        'Bouquet de menthe fraîche et zeste de citron vert.'
      );
    });

    it('should return null if no garnish step is found', () => {
      component.cocktail = {
        ...mockCocktail,
        recipeSteps: [
          {
            id: 1,
            stepOrder: 1,
            stepType: 'ACTION_TEMPLATE',
            actionType: 'SHAKE',
            templateName: 'Shaker',
          },
        ],
      };
      expect(component.resolvedGarnish).toBeNull();
    });
  });

  describe('Ingredient Deduplication', () => {
    it('should deduplicate and sum quantities of identical ingredients', () => {
      // mockCocktail has 'Rhum Blanc' twice (5cl + 1cl) and 'Jus de Citron Vert' (3cl)
      const deduped = component.deduplicatedIngredients;
      expect(deduped).toHaveSize(2);

      const rhum = deduped.find((i) => i.ingredientNom === 'Rhum Blanc');
      expect(rhum).toBeDefined();
      expect(rhum?.quantite).toBe(6);

      const citron = deduped.find((i) => i.ingredientNom === 'Jus de Citron Vert');
      expect(citron).toBeDefined();
      expect(citron?.quantite).toBe(3);
    });

    it('should fallback to recipeSteps of type INGREDIENT if ingredients array is empty', () => {
      component.cocktail = {
        ...mockCocktail,
        ingredients: [],
      };
      const deduped = component.deduplicatedIngredients;
      expect(deduped).toHaveSize(1);
      expect(deduped[0].ingredientNom).toBe('Rhum Blanc');
      expect(deduped[0].quantite).toBe(6);
    });

    it('should fallback to item.ingredients if cocktail ingredients and steps are empty', () => {
      component.cocktail = {
        ...mockCocktail,
        ingredients: [],
        recipeSteps: [],
      };
      component.item = {
        ...mockItem,
        ingredients: [
          { ingredientNom: 'Tequila', quantite: 4, uniteMesure: 'cl' },
          { ingredientNom: 'Tequila', quantite: 2, uniteMesure: 'cl' },
        ],
      };
      const deduped = component.deduplicatedIngredients;
      expect(deduped).toHaveSize(1);
      expect(deduped[0].ingredientNom).toBe('Tequila');
      expect(deduped[0].quantite).toBe(6);
    });

    it('should return empty array if no ingredients available anywhere', () => {
      component.cocktail = null;
      component.item = { ...mockItem, ingredients: [] };
      expect(component.deduplicatedIngredients).toEqual([]);
    });
  });

  describe('Step Completion & Interactivity', () => {
    it('should toggle step completion state', () => {
      expect(component.isStepCompleted(1, 0)).toBeFalse();

      component.toggleStepCompleted(1, 0);
      expect(component.isStepCompleted(1, 0)).toBeTrue();

      component.toggleStepCompleted(1, 0);
      expect(component.isStepCompleted(1, 0)).toBeFalse();
    });

    it('should fallback to index key if stepId is undefined', () => {
      expect(component.isStepCompleted(undefined, 2)).toBeFalse();

      component.toggleStepCompleted(undefined, 2);
      expect(component.isStepCompleted(undefined, 2)).toBeTrue();
    });

    it('should reset completed steps on item or cocktail change', () => {
      component.toggleStepCompleted(1, 0);
      expect(component.completedSteps.size).toBe(1);

      component.ngOnChanges({
        cocktail: new SimpleChange(null, mockCocktail, false),
      });
      expect(component.completedSteps.size).toBe(0);
    });
  });

  describe('Action Icons, Badges and Label Keys', () => {
    it('should return appropriate icon for all action types', () => {
      expect(component.getActionIcon('SHAKE')).toBe('wine-outline');
      expect(component.getActionIcon('STRAIN')).toBe('funnel-outline');
      expect(component.getActionIcon('MUDDLE')).toBe('hammer-outline');
      expect(component.getActionIcon('STIR')).toBe('sync-outline');
      expect(component.getActionIcon('ADD_ICE')).toBe('cube-outline');
      expect(component.getActionIcon('POUR')).toBe('water-outline');
      expect(component.getActionIcon('TOP_UP')).toBe('water-outline');
      expect(component.getActionIcon('GARNISH')).toBe('leaf-outline');
      expect(component.getActionIcon('BLEND')).toBe('hardware-chip-outline');
      expect(component.getActionIcon('FLAME')).toBe('flame-outline');
      expect(component.getActionIcon('OTHER')).toBe('sparkles-outline');
    });

    it('should return appropriate CSS badge class for all action types', () => {
      expect(component.getActionBadgeClass('SHAKE')).toBe('action-shake');
      expect(component.getActionBadgeClass('STRAIN')).toBe('action-strain');
      expect(component.getActionBadgeClass('MUDDLE')).toBe('action-muddle');
      expect(component.getActionBadgeClass('STIR')).toBe('action-stir');
      expect(component.getActionBadgeClass('ADD_ICE')).toBe('action-ice');
      expect(component.getActionBadgeClass('POUR')).toBe('action-pour');
      expect(component.getActionBadgeClass('TOP_UP')).toBe('action-pour');
      expect(component.getActionBadgeClass('GARNISH')).toBe('action-garnish');
      expect(component.getActionBadgeClass('BLEND')).toBe('action-blend');
      expect(component.getActionBadgeClass('FLAME')).toBe('action-flame');
      expect(component.getActionBadgeClass('OTHER')).toBe('action-default');
    });

    it('should return appropriate Transloco label keys for all action types', () => {
      expect(component.getActionLabelKey('SHAKE')).toBe('BARMAN_DASHBOARD.STEP_ACTION_SHAKE');
      expect(component.getActionLabelKey('STRAIN')).toBe('BARMAN_DASHBOARD.STEP_ACTION_STRAIN');
      expect(component.getActionLabelKey('MUDDLE')).toBe('BARMAN_DASHBOARD.STEP_ACTION_MUDDLE');
      expect(component.getActionLabelKey('STIR')).toBe('BARMAN_DASHBOARD.STEP_ACTION_STIR');
      expect(component.getActionLabelKey('ADD_ICE')).toBe('BARMAN_DASHBOARD.STEP_ACTION_ADD_ICE');
      expect(component.getActionLabelKey('POUR')).toBe('BARMAN_DASHBOARD.STEP_ACTION_POUR');
      expect(component.getActionLabelKey('TOP_UP')).toBe('BARMAN_DASHBOARD.STEP_ACTION_TOP_UP');
      expect(component.getActionLabelKey('GARNISH')).toBe('BARMAN_DASHBOARD.STEP_ACTION_GARNISH');
      expect(component.getActionLabelKey('BLEND')).toBe('BARMAN_DASHBOARD.STEP_ACTION_BLEND');
      expect(component.getActionLabelKey('FLAME')).toBe('BARMAN_DASHBOARD.STEP_ACTION_FLAME');
      expect(component.getActionLabelKey('OTHER')).toBe('BARMAN_DASHBOARD.STEP_ACTION_OTHER');
    });
  });

  describe('Image URL Resolution', () => {
    it('should resolve relative /uploads/ URLs with backend base URL', () => {
      const resolved = component.resolveImageUrl('/uploads/glassware/tumbler.png');
      expect(resolved).toContain('/uploads/glassware/tumbler.png');
    });

    it('should leave external or assets URLs intact', () => {
      expect(component.resolveImageUrl('assets/images/verres/verre_tumbler.png')).toBe(
        'assets/images/verres/verre_tumbler.png'
      );
      expect(component.resolveImageUrl('')).toBe('');
      expect(component.resolveImageUrl(undefined)).toBe('');
    });
  });

  describe('Panel Interaction & Events', () => {
    it('should emit closePanel when onClose is called', () => {
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

    it('should not trigger onClose on Escape press when closed', () => {
      component.isOpen = false;
      let closed = false;
      component.closePanel.subscribe(() => {
        closed = true;
      });

      component.onEscapePress();
      expect(closed).toBeFalse();
    });
  });

  describe('Template Rendering & Data Test IDs', () => {
    it('should render glassware card and garnish presentation', () => {
      const glassNameEl = fixture.nativeElement.querySelector('[data-testid="recipe-glassware-name"]');
      expect(glassNameEl?.textContent).toContain('Verre Tumbler / Highball');

      const glassCapacityEl = fixture.nativeElement.querySelector('[data-testid="recipe-glassware-capacity"]');
      expect(glassCapacityEl?.textContent).toContain('35');

      const garnishNameEl = fixture.nativeElement.querySelector('[data-testid="recipe-garnish-name"]');
      expect(garnishNameEl?.textContent).toContain('Bouquet de menthe');
    });

    it('should render view mode toggle buttons and switch mode on click', () => {
      const compactBtn = fixture.nativeElement.querySelector('[data-testid="btn-view-mode-compact"]');
      const fullBtn = fixture.nativeElement.querySelector('[data-testid="btn-view-mode-full"]');

      expect(compactBtn).toBeTruthy();
      expect(fullBtn).toBeTruthy();
      expect(fullBtn.classList.contains('active')).toBeTrue();

      compactBtn.click();
      fixture.detectChanges();

      expect(component.viewMode).toBe('compact');
      expect(compactBtn.classList.contains('active')).toBeTrue();

      const stepCards = fixture.nativeElement.querySelectorAll('.modular-step-card');
      expect(stepCards.length).toBe(1); // Only INGREDIENT step visible in compact mode
    });

    it('should render special instructions and priority pill when present', () => {
      const priorityPill = fixture.nativeElement.querySelector('[data-testid="recipe-priority-pill"]');
      expect(priorityPill).toBeTruthy();

      const variantBadge = fixture.nativeElement.querySelector('[data-testid="recipe-variant-badge"]');
      expect(variantBadge?.textContent).toContain('Extra Menthe');

      const notesText = fixture.nativeElement.querySelector('[data-testid="recipe-notes-text"]');
      expect(notesText?.textContent).toContain('Bien frais sans sucre ajouté');
    });

    it('should render modular steps list in full mode', () => {
      component.viewMode = 'full';
      fixture.detectChanges();

      const stepsList = fixture.nativeElement.querySelector('[data-testid="barman-recipe-steps-list"]');
      expect(stepsList).toBeTruthy();

      const step0 = fixture.nativeElement.querySelector('[data-testid="barman-step-0"]');
      expect(step0?.textContent).toContain('Rhum Blanc');
      expect(step0?.textContent).toContain('12 cl'); // 6cl * 2 (quantity)

      const step1 = fixture.nativeElement.querySelector('[data-testid="barman-step-1"]');
      expect(step1?.textContent).toContain('Piler la menthe fraîche');
      expect(step1?.textContent).toContain('15s');
    });
  });
});
