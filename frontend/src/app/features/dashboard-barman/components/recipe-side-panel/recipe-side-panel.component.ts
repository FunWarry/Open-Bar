import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  wineOutline,
  waterOutline,
  leafOutline,
  sparklesOutline,
  restaurantOutline,
  timeOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  checkmarkDoneOutline,
  cubeOutline,
  funnelOutline,
  hammerOutline,
  syncOutline,
  flameOutline,
  hardwareChipOutline,
  createOutline,
  flashOutline,
  listOutline,
  layersOutline,
  informationCircleOutline,
  pricetagOutline,
  bookmarkOutline,
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommandeItemView, CommandeView } from '../../models/commande-view.model';
import { Cocktail, CocktailVariante } from '../../../../core/models/cocktail.model';
import { Glassware } from '../../../../core/models/glassware.model';
import { CocktailRecipeStep } from '../../../../core/models/recipe-step.model';
import { environment } from '../../../../../environments/environment';

/**
 * Storage key used to persist the bartender's preferred recipe view mode.
 */
export const BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY = 'openbar_barman_recipe_view_mode';

/**
 * View mode options for the barman recipe side panel.
 * - 'compact': Quick dosages showing only ingredients in recipe sequence (rush optimized).
 * - 'full': Complete sequential mixology steps, techniques, action timers, and instructions.
 */
export type RecipeViewMode = 'compact' | 'full';

/**
 * Clean deduplicated ingredient view model for display in fallback scenarios.
 */
export interface DeduplicatedIngredient {
  id?: number;
  ingredientId?: number;
  ingredientNom: string;
  quantite: number;
  uniteMesure: string;
}

/**
 * Detailed Recipe and Preparation Side Panel Component for the Bar Counter.
 * Provides a comprehensive, step-by-step preparation breakdown including:
 * - View mode toggle (Compact dosages vs Full step-by-step) with localStorage persistence
 * - Dynamic glassware resolution, capacity display, and illustration support
 * - Dynamic garnish extraction from mixology steps with graceful fallback
 * - Sequential modular recipe steps with technique badges and duration timers
 * - Interactive step progression checkmarks during preparation rush
 * - Reactive multi-portion scaling (N x quantity) and ingredient deduplication
 * - High-visibility order context, variant badges, and bartender notes
 */
@Component({
  selector: 'app-recipe-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './recipe-side-panel.component.html',
  styleUrls: ['./recipe-side-panel.component.scss'],
})
export class RecipeSidePanelComponent implements OnInit, OnChanges {
  /** Whether the side panel is currently open and visible. */
  @Input() isOpen = false;

  /** The specific ordered item being inspected. */
  @Input() item: CommandeItemView | null = null;

  /** The parent order metadata. */
  @Input() commande: CommandeView | null = null;

  /** Full cocktail recipe entity from backend API. */
  @Input() cocktail: Cocktail | null = null;

  /** Whether the recipe details are currently loading. */
  @Input() isLoading = false;

  /** Emits when the user requests closing the side panel. */
  @Output() closePanel = new EventEmitter<void>();

  /** Current view mode: 'compact' or 'full'. */
  viewMode: RecipeViewMode = 'full';

  /** Set of step identifiers marked as completed by the bartender. */
  completedSteps = new Set<number | string>();

  constructor() {
    addIcons({
      closeOutline,
      wineOutline,
      waterOutline,
      leafOutline,
      sparklesOutline,
      restaurantOutline,
      timeOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
      checkmarkDoneOutline,
      cubeOutline,
      funnelOutline,
      hammerOutline,
      syncOutline,
      flameOutline,
      hardwareChipOutline,
      createOutline,
      flashOutline,
      listOutline,
      layersOutline,
      informationCircleOutline,
      pricetagOutline,
      bookmarkOutline,
    });
  }

  /**
   * Initializes the saved view mode from localStorage.
   */
  ngOnInit(): void {
    this.restoreViewModePreference();
  }

  /**
   * Resets completed steps when the active cocktail or item changes.
   *
   * @param changes Component property changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] || changes['cocktail']) {
      this.completedSteps.clear();
    }
  }

  /**
   * Restores view mode preference from localStorage with safe fallback.
   */
  restoreViewModePreference(): void {
    try {
      const savedMode = localStorage.getItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY);
      if (savedMode === 'compact' || savedMode === 'full') {
        this.viewMode = savedMode;
      } else {
        this.viewMode = 'full';
      }
    } catch {
      this.viewMode = 'full';
    }
  }

  /**
   * Switches the view mode and saves the selection to localStorage.
   *
   * @param mode Target view mode
   */
  setViewMode(mode: RecipeViewMode): void {
    this.viewMode = mode;
    try {
      localStorage.setItem(BARMAN_RECIPE_VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage write failures (e.g. private browsing storage quota)
    }
  }

  /**
   * Returns the item quantity (minimum 1).
   */
  get quantity(): number {
    return this.item?.quantite || 1;
  }

  /**
   * Calculates scaled dosage for the entire ordered quantity.
   *
   * @param singleQty Dosage for 1 unit
   * @returns Scaled total dosage formatted nicely
   */
  getTotalDosage(singleQty: number): number {
    return Math.round(singleQty * this.quantity * 100) / 100;
  }

  /**
   * Calculates scaled quantity for a recipe step.
   *
   * @param baseQty Base quantity per glass
   * @returns Total scaled quantity for this order
   */
  getScaledStepQuantity(baseQty: number | null | undefined): number {
    if (baseQty == null) return 0;
    return Math.round(baseQty * this.quantity * 100) / 100;
  }

  /**
   * Resolves the glassware entity from cocktail with graceful fallback.
   */
  get resolvedGlassware(): Glassware | null {
    return this.cocktail?.glassware || null;
  }

  /**
   * Extracts garnish recommendation from mixology steps or default instructions.
   */
  get resolvedGarnish(): string | null {
    if (!this.cocktail) return null;

    // Check if any recipe step is a GARNISH action
    if (this.cocktail.recipeSteps && this.cocktail.recipeSteps.length > 0) {
      const garnishStep = this.cocktail.recipeSteps.find(
        (step) =>
          step.actionType === 'GARNISH' ||
          (step.templateName && /garni/i.test(step.templateName)) ||
          (step.customText && /garni|zeste|menthe|rondelle|décor/i.test(step.customText))
      );

      if (garnishStep) {
        return garnishStep.customText || garnishStep.templateName || garnishStep.actionTitle || null;
      }
    }

    return null;
  }

  /**
   * Returns the visible recipe steps depending on the active view mode:
   * - In 'full' mode: all steps (mixology flow, ingredients, actions, instructions).
   * - In 'compact' mode: only INGREDIENT steps in the exact order of the recipe.
   */
  get visibleRecipeSteps(): CocktailRecipeStep[] {
    const steps = this.cocktail?.recipeSteps ?? [];
    if (this.viewMode === 'compact') {
      return steps.filter((s) => s.stepType === 'INGREDIENT');
    }
    return steps;
  }

  /**
   * Whether any steps are currently visible for the active view mode.
   */
  get hasVisibleSteps(): boolean {
    return this.visibleRecipeSteps.length > 0;
  }

  /**
   * Resolves the CocktailVariante entity matching the currently inspected item.
   */
  get resolvedItemVariante(): CocktailVariante | null {
    if (!this.item || !this.cocktail?.variantes) return null;
    if (this.item.varianteId) {
      const match = this.cocktail.variantes.find((v) => v.id === this.item?.varianteId);
      if (match) return match;
    }
    if (this.item.varianteNom) {
      const match = this.cocktail.variantes.find(
        (v) => v.nom.toLowerCase() === this.item?.varianteNom?.toLowerCase()
      );
      if (match) return match;
    }
    return null;
  }

  /**
   * Returns a deduplicated and consolidated list of ingredients with unitary quantities.
   */
  get deduplicatedIngredients(): DeduplicatedIngredient[] {
    const ingredientMap = new Map<string, DeduplicatedIngredient>();

    // 1. Prioritize variant-specific customized ingredients if available
    const itemVariante = this.resolvedItemVariante;
    if (itemVariante?.ingredients && itemVariante.ingredients.length > 0) {
      for (const vi of itemVariante.ingredients) {
        this.upsertIngredient(ingredientMap, {
          id: vi.id,
          ingredientId: vi.ingredientId,
          ingredientNom: vi.ingredientNom || 'Ingrédient',
          quantite: vi.quantite,
          uniteMesure: vi.unite || 'cl',
        });
      }
      return Array.from(ingredientMap.values());
    }

    if (this.cocktail?.ingredients && this.cocktail.ingredients.length > 0) {
      this.collectFromIngredients(ingredientMap);
      return Array.from(ingredientMap.values());
    }

    if (this.cocktail?.recipeSteps && this.cocktail.recipeSteps.length > 0) {
      this.collectFromRecipeSteps(ingredientMap);
      if (ingredientMap.size > 0) {
        return Array.from(ingredientMap.values());
      }
    }

    if (this.item?.ingredients && this.item.ingredients.length > 0) {
      this.collectFromItemIngredients(ingredientMap);
      return Array.from(ingredientMap.values());
    }

    return [];
  }

  /**
   * Aggregates ingredients from the cocktail.ingredients array into the map.
   *
   * @param map Target ingredient map
   */
  private collectFromIngredients(map: Map<string, DeduplicatedIngredient>): void {
    for (const ing of this.cocktail?.ingredients ?? []) {
      this.upsertIngredient(map, {
        id: ing.id,
        ingredientId: ing.ingredientId,
        ingredientNom: ing.ingredientNom,
        quantite: ing.quantite,
        uniteMesure: ing.uniteMesure || 'cl',
      });
    }
  }

  /**
   * Aggregates ingredients from recipeSteps of type INGREDIENT.
   *
   * @param map Target ingredient map
   */
  private collectFromRecipeSteps(map: Map<string, DeduplicatedIngredient>): void {
    const ingredientSteps = (this.cocktail?.recipeSteps ?? []).filter(
      (s) => s.stepType === 'INGREDIENT' && s.quantite != null
    );
    for (const step of ingredientSteps) {
      this.upsertIngredient(map, {
        id: step.id,
        ingredientId: step.ingredientId,
        ingredientNom: step.ingredientNom || 'Ingrédient',
        quantite: step.quantite ?? 0,
        uniteMesure: step.unite || 'cl',
      });
    }
  }

  /**
   * Aggregates ingredients from order item fallback ingredients.
   *
   * @param map Target ingredient map
   */
  private collectFromItemIngredients(map: Map<string, DeduplicatedIngredient>): void {
    for (const ing of this.item?.ingredients ?? []) {
      this.upsertIngredient(map, {
        id: ing.id,
        ingredientId: ing.ingredientId,
        ingredientNom: ing.ingredientNom,
        quantite: ing.quantite,
        uniteMesure: ing.uniteMesure || 'cl',
      });
    }
  }

  /**
   * Upserts an ingredient entry into the deduplication map.
   *
   * @param map Target ingredient map
   * @param item Ingredient to insert or merge
   */
  private upsertIngredient(map: Map<string, DeduplicatedIngredient>, item: DeduplicatedIngredient): void {
    const key = (item.ingredientNom || `ing_${item.ingredientId}`).toLowerCase().trim();
    const existing = map.get(key);
    if (existing) {
      existing.quantite = Math.round((existing.quantite + item.quantite) * 100) / 100;
    } else {
      map.set(key, { ...item });
    }
  }

  /**
   * Toggles the completion state of a preparation step.
   *
   * @param stepId Step identifier or index fallback
   * @param index Step index
   */
  toggleStepCompleted(stepId: number | string | undefined, index: number): void {
    const key = stepId ?? `idx_${index}`;
    if (this.completedSteps.has(key)) {
      this.completedSteps.delete(key);
    } else {
      this.completedSteps.add(key);
    }
  }

  /**
   * Checks whether a step is currently marked as completed.
   *
   * @param stepId Step identifier or index fallback
   * @param index Step index
   * @returns True if marked completed
   */
  isStepCompleted(stepId: number | string | undefined, index: number): boolean {
    const key = stepId ?? `idx_${index}`;
    return this.completedSteps.has(key);
  }

  /**
   * Resolves the ingredient name for a recipe step, with fallback lookup in cocktail.ingredients.
   *
   * @param step The recipe step
   * @returns Resolved ingredient name
   */
  getStepIngredientNom(step: CocktailRecipeStep): string {
    if (step.ingredientNom) {
      return step.ingredientNom;
    }
    if (step.ingredientName) {
      return step.ingredientName;
    }
    if (step.ingredientId && this.cocktail?.ingredients) {
      const match = this.cocktail.ingredients.find(
        (i) => i.ingredientId === step.ingredientId || i.id === step.ingredientId
      );
      if (match?.ingredientNom) {
        return match.ingredientNom;
      }
    }
    return 'Ingrédient';
  }

  /**
   * Resolves the action name for a template recipe step.
   *
   * @param step The recipe step
   * @returns Resolved action name or template name
   */
  getStepActionName(step: CocktailRecipeStep): string {
    return (
      step.templateName ||
      step.template?.name ||
      step.actionTitle ||
      ''
    );
  }

  /**
   * Resolves the action category type for a recipe step.
   *
   * @param step The recipe step
   * @returns Resolved action type
   */
  getStepActionType(step: CocktailRecipeStep): string | undefined {
    return step.actionType || step.template?.actionType;
  }

  /**
   * Resolves the duration in seconds for a recipe step.
   *
   * @param step The recipe step
   * @returns Duration in seconds or null
   */
  getStepDurationSeconds(step: CocktailRecipeStep): number | null {
    if (step.durationSeconds != null) {
      return step.durationSeconds;
    }
    if (step.template?.defaultDurationSeconds != null) {
      return step.template.defaultDurationSeconds;
    }
    return null;
  }

  /**
   * Resolves relative image paths to the backend host when starting with /uploads/.
   *
   * @param url Image URL or relative path
   * @returns Fully qualified or untouched URL
   */
  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${url}`;
    }
    return url;
  }

  /**
   * Returns the corresponding Ionic icon for a mixology action type.
   *
   * @param actionType Action category identifier
   * @returns IonIcon name
   */
  getActionIcon(actionType?: string): string {
    switch (actionType) {
      case 'SHAKE':
        return 'wine-outline';
      case 'STRAIN':
        return 'funnel-outline';
      case 'MUDDLE':
        return 'hammer-outline';
      case 'STIR':
        return 'sync-outline';
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
   * Returns the CSS modifier class for styling action badges with distinct color palettes.
   *
   * @param actionType Action category identifier
   * @returns CSS modifier class
   */
  getActionBadgeClass(actionType?: string): string {
    switch (actionType) {
      case 'SHAKE':
        return 'action-shake';
      case 'STRAIN':
        return 'action-strain';
      case 'MUDDLE':
        return 'action-muddle';
      case 'STIR':
        return 'action-stir';
      case 'ADD_ICE':
        return 'action-ice';
      case 'POUR':
      case 'TOP_UP':
        return 'action-pour';
      case 'GARNISH':
        return 'action-garnish';
      case 'BLEND':
        return 'action-blend';
      case 'FLAME':
        return 'action-flame';
      default:
        return 'action-default';
    }
  }

  /**
   * Returns the Transloco i18n key corresponding to an action type.
   *
   * @param actionType Action category identifier
   * @returns Transloco key
   */
  getActionLabelKey(actionType?: string): string {
    switch (actionType) {
      case 'SHAKE':
        return 'BARMAN_DASHBOARD.STEP_ACTION_SHAKE';
      case 'STRAIN':
        return 'BARMAN_DASHBOARD.STEP_ACTION_STRAIN';
      case 'MUDDLE':
        return 'BARMAN_DASHBOARD.STEP_ACTION_MUDDLE';
      case 'STIR':
        return 'BARMAN_DASHBOARD.STEP_ACTION_STIR';
      case 'ADD_ICE':
        return 'BARMAN_DASHBOARD.STEP_ACTION_ADD_ICE';
      case 'POUR':
        return 'BARMAN_DASHBOARD.STEP_ACTION_POUR';
      case 'TOP_UP':
        return 'BARMAN_DASHBOARD.STEP_ACTION_TOP_UP';
      case 'GARNISH':
        return 'BARMAN_DASHBOARD.STEP_ACTION_GARNISH';
      case 'BLEND':
        return 'BARMAN_DASHBOARD.STEP_ACTION_BLEND';
      case 'FLAME':
        return 'BARMAN_DASHBOARD.STEP_ACTION_FLAME';
      default:
        return 'BARMAN_DASHBOARD.STEP_ACTION_OTHER';
    }
  }

  /**
   * Closes the side panel.
   */
  onClose(): void {
    this.closePanel.emit();
  }

  /**
   * Listens to Escape key presses to dismiss the side panel.
   */
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }
}
