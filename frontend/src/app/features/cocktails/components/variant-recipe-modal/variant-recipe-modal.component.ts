import { Component, Input, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonToggle,
  IonIcon,
  IonFooter,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { AppSettingsService } from '../../../../core/services/app-settings.service';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  saveOutline,
  refreshOutline,
  addOutline,
  trashOutline,
  arrowUpOutline,
  arrowDownOutline,
  wineOutline,
  sparklesOutline,
  pricetagOutline,
  layersOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  createOutline,
  syncOutline,
  funnelOutline,
  hammerOutline,
  cubeOutline,
  waterOutline,
  leafOutline,
  hardwareChipOutline,
  flameOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  CocktailVariante,
  CocktailVarianteIngredient,
} from '../../../../core/models/cocktail.model';
import {
  CocktailRecipeStep,
  RecipeStepTemplate,
  RecipeStepType,
} from '../../../../core/models/recipe-step.model';
import { Ingredient } from '../../../../core/models/ingredient.model';
import {
  SearchableOption,
  SearchableSelectComponent,
} from '../../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Interactive Modal for configuring and customizing complete cocktail variant recipes.
 * Supports ingredient adjustments (replacements, extra/custom ingredients), volume recalculation,
 * dynamic pricing overrides, and step-by-step recipe editing.
 */
@Component({
  selector: 'app-variant-recipe-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonToggle,
    IonIcon,
    IonFooter,
    TranslocoPipe,
    AppCurrencyPipe,
    SearchableSelectComponent,
  ],
  templateUrl: './variant-recipe-modal.component.html',
  styleUrls: ['./variant-recipe-modal.component.scss'],
})
export class VariantRecipeModalComponent implements OnInit {
  private readonly appSettingsService = inject(AppSettingsService);

  get currencySymbol(): string {
    return this.appSettingsService.currencySymbol;
  }
  /** The variant being edited, or null for creating a new variant. */
  @Input() variante: CocktailVariante | null = null;

  /** Base cocktail name for display context. */
  @Input() baseCocktailName = '';

  /** Base cocktail price. */
  @Input() baseCocktailPrice = 0;

  /** Full sequential recipe steps from the parent cocktail for reference and inheritance. */
  @Input() baseRecipeSteps: CocktailRecipeStep[] = [];

  /** Full catalog of available ingredients for additions and substitutions. */
  @Input() availableIngredients: Ingredient[] = [];

  /** Full catalog of action templates for mixing steps. */
  @Input() availableTemplates: RecipeStepTemplate[] = [];

  private readonly modalCtrl = inject(ModalController);

  // Form Fields
  id: number | null = null;
  nom = '';
  description = '';
  prixSupplement = 0;
  multiplicateurIngredient = 1.0;
  disponible = true;
  instructions = '';

  /** Sequential recipe steps for this specific variant */
  recipeSteps: CocktailRecipeStep[] = [];

  /** Computed options for ingredient searchable select */
  readonly ingredientOptions = computed<SearchableOption[]>(() =>
    this.availableIngredients.map((i) => ({
      value: i.id,
      label: i.nom,
      sublabel: `${i.quantiteStock ?? 0} ${i.uniteMesure || 'cl'} en stock`,
    }))
  );

  /** Computed options for template searchable select */
  readonly templateOptions = computed<SearchableOption[]>(() =>
    this.availableTemplates.map((t) => ({
      value: t.id,
      label: t.name,
      sublabel: t.defaultDurationSeconds ? `${t.defaultDurationSeconds}s` : undefined,
    }))
  );

  constructor() {
    addIcons({
      closeOutline,
      saveOutline,
      refreshOutline,
      addOutline,
      trashOutline,
      arrowUpOutline,
      arrowDownOutline,
      wineOutline,
      sparklesOutline,
      pricetagOutline,
      layersOutline,
      informationCircleOutline,
      checkmarkCircleOutline,
      documentTextOutline,
      createOutline,
      syncOutline,
      funnelOutline,
      hammerOutline,
      cubeOutline,
      waterOutline,
      leafOutline,
      hardwareChipOutline,
      flameOutline,
      timeOutline,
    });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    if (this.variante) {
      this.id = this.variante.id ?? null;
      this.nom = this.variante.nom || '';
      this.description = this.variante.description || '';
      this.prixSupplement = this.variante.prixSupplement ?? 0;
      this.multiplicateurIngredient = this.variante.multiplicateurIngredient ?? 1.0;
      this.disponible = this.variante.disponible !== false;
      this.instructions = this.variante.instructions || '';

      if (this.variante.recipeSteps && this.variante.recipeSteps.length > 0) {
        this.recipeSteps = structuredClone(this.variante.recipeSteps);
      } else if (this.variante.ingredients && this.variante.ingredients.length > 0) {
        this.initializeFromVariantIngredients(this.variante.ingredients);
      } else {
        this.resetToBaseRecipe();
      }
    } else {
      this.resetToBaseRecipe();
    }
  }

  /**
   * Initializes or resets the variant recipe steps to a deep clone of the base cocktail steps.
   */
  resetToBaseRecipe(): void {
    if (this.baseRecipeSteps && this.baseRecipeSteps.length > 0) {
      this.recipeSteps = structuredClone(this.baseRecipeSteps);
    } else {
      this.recipeSteps = [];
    }
    this.reorderSteps();
  }

  /**
   * Converts existing variant ingredients into initial recipe steps if no steps existed.
   */
  private initializeFromVariantIngredients(ingredients: CocktailVarianteIngredient[]): void {
    this.recipeSteps = ingredients.map((ing, idx) => ({
      stepOrder: idx + 1,
      stepType: 'INGREDIENT' as RecipeStepType,
      ingredientId: ing.ingredientId,
      ingredientNom: ing.ingredientNom || this.findIngredientName(ing.ingredientId),
      quantite: ing.quantite,
      unite: ing.unite || 'cl',
      customText: ing.notes || '',
    }));
  }

  /**
   * Adds a new ingredient step to the variant recipe.
   */
  addIngredientStep(): void {
    const firstIng = this.availableIngredients[0];
    this.recipeSteps.push({
      stepOrder: this.recipeSteps.length + 1,
      stepType: 'INGREDIENT',
      ingredientId: firstIng?.id,
      ingredientNom: firstIng?.nom || '',
      quantite: 4,
      unite: firstIng?.uniteMesure || 'cl',
      customText: '',
    });
  }

  /**
   * Adds an action template step to the variant recipe.
   */
  addActionTemplateStep(): void {
    const firstTpl = this.availableTemplates[0];
    this.recipeSteps.push({
      stepOrder: this.recipeSteps.length + 1,
      stepType: 'ACTION_TEMPLATE',
      templateId: firstTpl?.id,
      templateName: firstTpl?.name || '',
      actionType: firstTpl?.actionType || 'SHAKE',
      durationSeconds: firstTpl?.defaultDurationSeconds || 15,
      customText: firstTpl?.description || '',
    });
  }

  /**
   * Adds a custom text / instruction step to the variant recipe.
   */
  addCustomTextStep(): void {
    this.recipeSteps.push({
      stepOrder: this.recipeSteps.length + 1,
      stepType: 'CUSTOM_TEXT',
      actionTitle: '',
      durationSeconds: 15,
      customText: '',
    });
  }

  /**
   * Moves a recipe step up in sequence.
   */
  moveStepUp(index: number): void {
    if (index <= 0) return;
    const item = this.recipeSteps.splice(index, 1)[0];
    this.recipeSteps.splice(index - 1, 0, item);
    this.reorderSteps();
  }

  /**
   * Moves a recipe step down in sequence.
   */
  moveStepDown(index: number): void {
    if (index >= this.recipeSteps.length - 1) return;
    const item = this.recipeSteps.splice(index, 1)[0];
    this.recipeSteps.splice(index + 1, 0, item);
    this.reorderSteps();
  }

  /**
   * Removes a step from the variant recipe.
   */
  removeStep(index: number): void {
    this.recipeSteps.splice(index, 1);
    this.reorderSteps();
  }

  /**
   * Applies a global ingredient multiplier to all ingredient steps.
   */
  applyMultiplier(multiplier: number): void {
    if (!multiplier || multiplier <= 0) return;
    const prev = this.multiplicateurIngredient || 1.0;
    const ratio = multiplier / prev;
    this.multiplicateurIngredient = multiplier;

    this.recipeSteps.forEach((step) => {
      if (step.stepType === 'INGREDIENT' && step.quantite != null) {
        step.quantite = Math.round(step.quantite * ratio * 10) / 10;
      }
    });
  }

  /**
   * Handles ingredient selection for a specific step.
   */
  onIngredientSelected(index: number, option: any): void {
    const val = option && typeof option === 'object' && 'value' in option ? option.value : option;
    const ing = this.availableIngredients.find((i) => i.id === +val);
    if (ing && this.recipeSteps[index]) {
      this.recipeSteps[index].ingredientId = ing.id;
      this.recipeSteps[index].ingredientNom = ing.nom;
      this.recipeSteps[index].unite = ing.uniteMesure || 'cl';
    }
  }

  /**
   * Handles action template selection for a specific step.
   */
  onTemplateSelected(index: number, option: any): void {
    const val = option && typeof option === 'object' && 'value' in option ? option.value : option;
    const tpl = this.availableTemplates.find((t) => t.id === +val);
    if (tpl && this.recipeSteps[index]) {
      this.recipeSteps[index].templateId = tpl.id;
      this.recipeSteps[index].templateName = tpl.name;
      this.recipeSteps[index].actionType = tpl.actionType;
      this.recipeSteps[index].durationSeconds = tpl.defaultDurationSeconds || undefined;
      if (!this.recipeSteps[index].customText) {
        this.recipeSteps[index].customText = tpl.description || '';
      }
    }
  }

  /**
   * Returns appropriate icon for action types.
   */
  getActionIcon(actionType?: string | null): string {
    switch (actionType) {
      case 'SHAKE':
        return 'sync-outline';
      case 'STRAIN':
        return 'funnel-outline';
      case 'MUDDLE':
        return 'hammer-outline';
      case 'STIR':
        return 'wine-outline';
      case 'ADD_ICE':
        return 'cube-outline';
      case 'POUR':
      case 'TOP_UP':
        return 'water-outline';
      case 'GARNISH':
        return 'leaf-outline';
      case 'BLEND':
        return 'hardware-chip-outline';
      case 'FLAME':
        return 'flame-outline';
      default:
        return 'sparkles-outline';
    }
  }

  /**
   * Computes effective price including variant surcharge.
   */
  get effectivePrice(): number {
    return (this.baseCocktailPrice || 0) + (this.prixSupplement || 0);
  }

  /**
   * Total liquid volume calculated from liquid ingredient steps (cl).
   */
  get totalVolume(): number {
    return this.recipeSteps
      .filter((s) => s.stepType === 'INGREDIENT' && (s.unite === 'cl' || !s.unite))
      .reduce((sum, s) => sum + (s.quantite || 0), 0);
  }

  /**
   * Total count of ingredient steps in the recipe.
   */
  get ingredientCount(): number {
    return this.recipeSteps.filter((s) => s.stepType === 'INGREDIENT').length;
  }

  private reorderSteps(): void {
    this.recipeSteps.forEach((s, idx) => {
      s.stepOrder = idx + 1;
    });
  }

  private findIngredientName(id: number): string {
    return this.availableIngredients.find((i) => i.id === id)?.nom || 'Ingrédient';
  }

  /**
   * Checks whether the current recipe steps differ in any way from the base cocktail recipe.
   * If identical, returns false so that we only store customizations/diffs and avoid redundant DB storage.
   */
  checkIfRecipeIsCustomized(): boolean {
    if (!this.baseRecipeSteps || this.baseRecipeSteps.length === 0) {
      return this.recipeSteps.length > 0;
    }
    if (this.recipeSteps.length !== this.baseRecipeSteps.length) {
      return true;
    }
    return this.recipeSteps.some((step, idx) => !this.areRecipeStepsIdentical(step, this.baseRecipeSteps[idx]));
  }

  private areRecipeStepsIdentical(stepA: CocktailRecipeStep, stepB: CocktailRecipeStep): boolean {
    return (
      stepA.stepType === stepB.stepType &&
      stepA.ingredientId === stepB.ingredientId &&
      (stepA.quantite ?? 0) === (stepB.quantite ?? 0) &&
      (stepA.unite || 'cl') === (stepB.unite || 'cl') &&
      stepA.templateId === stepB.templateId &&
      (stepA.actionTitle || '') === (stepB.actionTitle || '') &&
      (stepA.customText || '') === (stepB.customText || '') &&
      (stepA.durationSeconds || 0) === (stepB.durationSeconds || 0)
    );
  }

  /**
   * Cancels editing and closes the modal without saving.
   */
  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /**
   * Saves the variant and closes the modal.
   * Stores customized steps and ingredients only when they differ from the base recipe.
   */
  save(): void {
    if (!this.nom.trim()) return;

    const isCustomized = this.checkIfRecipeIsCustomized();

    let extractedIngredients: CocktailVarianteIngredient[] = [];
    let stepsToSave: CocktailRecipeStep[] | undefined = undefined;

    if (isCustomized) {
      stepsToSave = this.recipeSteps;
      extractedIngredients = this.recipeSteps
        .filter((s) => s.stepType === 'INGREDIENT' && s.ingredientId)
        .map((s) => ({
          ingredientId: s.ingredientId!,
          ingredientNom: s.ingredientNom || this.findIngredientName(s.ingredientId!),
          quantite: s.quantite || 0,
          unite: s.unite || 'cl',
          notes: s.customText || undefined,
        }));
    }

    const result: CocktailVariante = {
      id: this.id ?? undefined,
      nom: this.nom.trim(),
      description: this.description.trim() || undefined,
      prixSupplement: this.prixSupplement || 0,
      multiplicateurIngredient: this.multiplicateurIngredient || 1.0,
      disponible: this.disponible,
      instructions: this.instructions.trim() || undefined,
      ingredients: extractedIngredients,
      recipeSteps: stepsToSave,
    };

    this.modalCtrl.dismiss(result, 'confirm');
  }
}
