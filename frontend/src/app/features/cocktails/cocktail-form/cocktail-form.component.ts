import { Component, OnInit, signal, computed, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  AbstractControl,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ToastController,
  ModalController,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { VariantRecipeModalComponent } from '../components/variant-recipe-modal/variant-recipe-modal.component';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  cameraOutline,
  imageOutline,
  addOutline,
  removeOutline,
  trashOutline,
  arrowUpOutline,
  arrowDownOutline,
  wineOutline,
  waterOutline,
  leafOutline,
  sparklesOutline,
  timeOutline,
  hammerOutline,
  funnelOutline,
  syncOutline,
  cubeOutline,
  flameOutline,
  hardwareChipOutline,
  createOutline,
  saveOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  chevronBackOutline,
  duplicateOutline,
  eyeOutline,
  listOutline,
  restaurantOutline,
  helpCircleOutline,
  closeOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CocktailService } from '../../../core/services/cocktail.service';
import { IngredientService } from '../../../core/services/ingredient.service';
import { RecipeStepTemplateService } from '../../../core/services/recipe-step-template.service';
import { GlasswareService } from '../../../core/services/glassware.service';
import {
  Cocktail,
  CocktailIngredientItem,
} from '../../../core/models/cocktail.model';
import { Ingredient } from '../../../core/models/ingredient.model';
import { Glassware } from '../../../core/models/glassware.model';
import {
  RecipeStepActionType,
  RecipeStepTemplate,
  CocktailRecipeStep,
  CocktailRecipeStepRequest,
} from '../../../core/models/recipe-step.model';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import {
  SearchableSelectComponent,
  SearchableOption,
} from '../../../core/components/ui/searchable-select/searchable-select.component';
import { CocktailSaisonnaliteComponent } from '../cocktail-saisonnalite/cocktail-saisonnalite.component';
import { CommonModule } from '@angular/common';

/**
 * Model representing a deduced bar tool / equipment item.
 */
export interface BarEquipmentItem {
  name: string;
  category: 'GLASS' | 'MEASURE' | 'PREPARATION' | 'FINISH';
  icon: string;
  reason: string;
}

/**
 * Step-by-Step Wizard & Modular Block Cocktail Builder Component.
 * Supports:
 * - Step 1: General Info, Glassware Selection & Photo Upload
 * - Step 2: Recipe Block Builder (Ingredients, Action Templates, Custom Text)
 * - Step 3: Variants & Service Options
 * - Step 4: Technical Recipe Card Preview with Scaled Dosages & Deduced Bar Equipment
 */
@Component({
  selector: 'app-cocktail-form',
  templateUrl: './cocktail-form.component.html',
  styleUrls: ['./cocktail-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    FormsModule,
    ReactiveFormsModule,
    TranslocoModule,
    InputFieldComponent,
    ActionButtonComponent,
    SearchableSelectComponent,
    CocktailSaisonnaliteComponent,
  ],
})
export class CocktailFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  public readonly router = inject(Router);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);
  private readonly templateService = inject(RecipeStepTemplateService);
  private readonly glasswareService = inject(GlasswareService);
  private readonly transloco = inject(TranslocoService);

  // Wizard state (1: General, 2: Recipe Blocks, 3: Variants, 4: Preview & Scaling)
  currentStep = signal<number>(1);
  totalSteps = 4;

  isEditMode = false;
  cocktailId: number | null = null;
  cocktailData: Cocktail | null = null;

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  // Available database items for dropdowns
  ingredientsList = signal<Ingredient[]>([]);
  templatesList = signal<RecipeStepTemplate[]>([]);
  glasswareList = signal<Glassware[]>([]);

  // Category options for searchable combobox
  categoryOptions = computed<SearchableOption[]>(() => [
    { value: 'ALCOOLISE', label: this.transloco.translate('COCKTAILS.CATEGORIES.ALCOOLISE'), icon: 'wine-outline' },
    { value: 'SANS_ALCOOL', label: this.transloco.translate('COCKTAILS.CATEGORIES.SANS_ALCOOL'), icon: 'water-outline' },
    { value: 'SHOT', label: this.transloco.translate('COCKTAILS.CATEGORIES.SHOT'), icon: 'flame-outline' },
    { value: 'APERITIF', label: this.transloco.translate('COCKTAILS.CATEGORIES.APERITIF'), icon: 'restaurant-outline' },
    { value: 'DIGESTIF', label: this.transloco.translate('COCKTAILS.CATEGORIES.DIGESTIF'), icon: 'wine-outline' },
    { value: 'SPECIAL', label: this.transloco.translate('COCKTAILS.CATEGORIES.SPECIAL'), icon: 'sparkles-outline' },
  ]);

  // Glassware options with live search, capacity badges and illustrations
  glasswareOptions = computed<SearchableOption[]>(() => {
    return this.glasswareList().map((g) => ({
      value: g.id,
      label: g.nom,
      badge: `${g.contenanceCl} cl`,
      badgeType: 'primary',
      subLabel: g.description || undefined,
      imageUrl: g.imageUrl || undefined,
      icon: 'wine-outline',
    }));
  });

  // Ingredient options with live search, unit badges, and stock indicators
  ingredientOptions = computed<SearchableOption[]>(() => {
    return this.ingredientsList().map((ing) => ({
      value: ing.id,
      label: ing.nom,
      badge: ing.uniteMesure || undefined,
      badgeType:
        ing.quantiteStock != null && ing.seuilAlerte != null && ing.quantiteStock <= ing.seuilAlerte
          ? 'warning'
          : 'neutral',
      subLabel: ing.quantiteStock != null ? `Stock: ${ing.quantiteStock} ${ing.uniteMesure || ''}` : undefined,
      icon: 'leaf-outline',
    }));
  });

  // Action template options with duration badges and action icons
  templateOptions = computed<SearchableOption[]>(() => {
    return this.templatesList().map((tpl) => ({
      value: tpl.id,
      label: tpl.name,
      badge: tpl.defaultDurationSeconds ? `${tpl.defaultDurationSeconds}s` : undefined,
      badgeType: 'primary',
      subLabel: tpl.description || undefined,
      icon: this.getActionIcon(tpl.actionType),
    }));
  });

  // Action type options for template creation modal
  actionTypeOptions = computed<SearchableOption[]>(() => [
    { value: 'SHAKE', label: this.transloco.translate('COCKTAILS.ACTIONS.SHAKE'), icon: 'sync-outline' },
    { value: 'STRAIN', label: this.transloco.translate('COCKTAILS.ACTIONS.STRAIN'), icon: 'funnel-outline' },
    { value: 'MUDDLE', label: this.transloco.translate('COCKTAILS.ACTIONS.MUDDLE'), icon: 'hammer-outline' },
    { value: 'STIR', label: this.transloco.translate('COCKTAILS.ACTIONS.STIR'), icon: 'funnel-outline' },
    { value: 'ADD_ICE', label: this.transloco.translate('COCKTAILS.ACTIONS.ADD_ICE'), icon: 'cube-outline' },
    { value: 'POUR', label: this.transloco.translate('COCKTAILS.ACTIONS.POUR'), icon: 'water-outline' },
    { value: 'TOP_UP', label: this.transloco.translate('COCKTAILS.ACTIONS.TOP_UP'), icon: 'water-outline' },
    { value: 'GARNISH', label: this.transloco.translate('COCKTAILS.ACTIONS.GARNISH'), icon: 'leaf-outline' },
    { value: 'BLEND', label: this.transloco.translate('COCKTAILS.ACTIONS.BLEND'), icon: 'hardware-chip-outline' },
    { value: 'FLAME', label: this.transloco.translate('COCKTAILS.ACTIONS.FLAME'), icon: 'flame-outline' },
    { value: 'OTHER', label: this.transloco.translate('COCKTAILS.ACTIONS.OTHER'), icon: 'sparkles-outline' },
  ]);

  // Predefined image choices for glassware creation
  glasswareImageChoices = [
    { label: 'Tumbler / Highball', value: 'assets/images/verres/verre_tumbler.png' },
    { label: 'Old Fashioned / Rocks', value: 'assets/images/verres/verre_old_fashioned.png' },
    { label: 'Coupe Martini', value: 'assets/images/verres/verre_martini.png' },
    { label: 'Verre Margarita', value: 'assets/images/verres/verre_margarita.png' },
    { label: 'Verre Ballon / Copa', value: 'assets/images/verres/verre_ballon.png' },
    { label: 'Flûte à Champagne', value: 'assets/images/verres/verre_flute.png' },
    { label: 'Tasse en cuivre', value: 'assets/images/verres/tasse_cuivre.png' },
    { label: 'Verre Tiki', value: 'assets/images/verres/verre_tiki.png' },
  ];

  // Interactive portions count for preview scaling
  previewPortions = signal<number>(1);

  // New reusable template modal state
  isNewTemplateModalOpen = signal<boolean>(false);
  newTemplateName = '';
  newTemplateActionType: RecipeStepActionType = 'SHAKE';
  newTemplateDuration = 15;
  newTemplateIcon = 'wine-outline';
  newTemplateDescription = '';

  // New glassware modal state
  isNewGlasswareModalOpen = signal<boolean>(false);
  newGlasswareNom = '';
  newGlasswareContenanceCl = 30;
  newGlasswareImageUrl = 'assets/images/verres/verre_tumbler.png';
  newGlasswareDescription = '';
  newGlasswareSourceType = signal<'PRESET' | 'CUSTOM'>('PRESET');
  customGlasswareFile: File | null = null;
  customGlasswarePreview = signal<string | null>(null);

  recipeVersion = signal<number>(0);
  selectedGlasswareId = signal<number | null>(null);

  cocktailForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    category: ['', Validators.required],
    glasswareId: [null],
    instructions: [''],
    recipeSteps: this.fb.array([]),
    variantes: this.fb.array([]),
  });

  /**
   * Automatically deduces required bar tools and equipment from
   * selected glassware, measured quantities, and recipe actions.
   */
  deducedBarEquipment = computed<BarEquipmentItem[]>(() => {
    this.recipeVersion(); // Track reactive changes
    const items: BarEquipmentItem[] = [];

    const glassId = this.selectedGlasswareId() ?? this.cocktailForm.get('glasswareId')?.value;
    const glass = this.getGlassEquipment(glassId);
    if (glass) {
      items.push(glass);
    }

    if (this.hasMeasuredIngredients()) {
      items.push({
        name: 'Doseur gradué / Jigger',
        category: 'MEASURE',
        icon: 'funnel-outline',
        reason: 'Dosage précis des composants',
      });
    }

    const actionTypes = new Set<string>(
      this.recipeStepsArray.controls
        .filter((ctrl) => ctrl.get('stepType')?.value === 'ACTION_TEMPLATE')
        .map((ctrl) => ctrl.get('actionType')?.value)
        .filter((a): a is string => Boolean(a))
    );

    items.push(...this.getActionEquipment(actionTypes));
    return items;
  });

  private getGlassEquipment(glasswareId: number | null): BarEquipmentItem | null {
    if (!glasswareId) return null;
    const selectedGlass = this.glasswareList().find((g) => g.id === +glasswareId);
    if (!selectedGlass) return null;
    return {
      name: selectedGlass.nom,
      category: 'GLASS',
      icon: 'wine-outline',
      reason: `${selectedGlass.contenanceCl} cl`,
    };
  }

  private hasMeasuredIngredients(): boolean {
    return this.recipeStepsArray.controls.some(
      (ctrl) => ctrl.get('stepType')?.value === 'INGREDIENT' && Number(ctrl.get('quantite')?.value) > 0
    );
  }

  private getActionEquipment(actionTypes: Set<string>): BarEquipmentItem[] {
    const items: BarEquipmentItem[] = [];
    const actionEquipmentMap: Record<string, BarEquipmentItem[]> = {
      SHAKE: [
        { name: 'Shaker cocktail (Boston / Parisian)', category: 'PREPARATION', icon: 'sync-outline', reason: 'Émulsion et aération rapide' },
        { name: 'Passoire Hawthorne (Strainer)', category: 'PREPARATION', icon: 'funnel-outline', reason: 'Filtration de la glace' },
        { name: 'Glaçons / Ice cubes', category: 'PREPARATION', icon: 'cube-outline', reason: 'Refroidissement shaker' },
      ],
      STRAIN: [
        { name: 'Passoire fine (Fine mesh strainer)', category: 'PREPARATION', icon: 'funnel-outline', reason: 'Double filtration (pulpe/particules)' },
      ],
      MUDDLE: [
        { name: 'Pilon de bar (Muddler)', category: 'PREPARATION', icon: 'hammer-outline', reason: 'Extraction des arômes et herbes' },
      ],
      STIR: [
        { name: 'Verre à mélange (Mixing glass)', category: 'PREPARATION', icon: 'wine-outline', reason: 'Mélange délicat au bar' },
        { name: 'Cuillère de bar torsadée (Bar spoon)', category: 'PREPARATION', icon: 'restaurant-outline', reason: 'Agitation douce sans bulles' },
      ],
      ADD_ICE: [
        { name: 'Pince à glaçons / Pelle à glace', category: 'PREPARATION', icon: 'cube-outline', reason: 'Service et hygiène de la glace' },
      ],
      BLEND: [
        { name: 'Mixeur / Blender électrique', category: 'PREPARATION', icon: 'hardware-chip-outline', reason: 'Texture frozen onctueuse' },
      ],
      FLAME: [
        { name: 'Chalumeau de bar / Briquet', category: 'FINISH', icon: 'flame-outline', reason: 'Expression des huiles et flambage' },
      ],
      GARNISH: [
        { name: 'Pince à garniture / Couteau d’office', category: 'FINISH', icon: 'leaf-outline', reason: 'Découpe et dressage des zestes' },
      ],
    };

    for (const action of actionTypes) {
      const toolList = actionEquipmentMap[action];
      if (toolList) {
        items.push(...toolList);
      }
    }
    return items;
  }

  constructor() {
    addIcons({
      calendarOutline,
      cameraOutline,
      imageOutline,
      addOutline,
      removeOutline,
      trashOutline,
      arrowUpOutline,
      arrowDownOutline,
      wineOutline,
      waterOutline,
      leafOutline,
      sparklesOutline,
      timeOutline,
      hammerOutline,
      funnelOutline,
      syncOutline,
      cubeOutline,
      flameOutline,
      hardwareChipOutline,
      createOutline,
      saveOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      chevronBackOutline,
      duplicateOutline,
      eyeOutline,
      listOutline,
      restaurantOutline,
      helpCircleOutline,
      closeOutline,
      informationCircleOutline,
    });
  }

  get recipeStepsArray(): FormArray {
    return this.cocktailForm.get('recipeSteps') as FormArray;
  }

  get variantesArray(): FormArray {
    return this.cocktailForm.get('variantes') as FormArray;
  }

  getAsFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  ngOnInit(): void {
    this.loadIngredients();
    this.loadTemplates();
    this.loadGlassware();

    this.cocktailForm.valueChanges.subscribe((val) => {
      this.selectedGlasswareId.set(val?.glasswareId ?? null);
      this.recipeVersion.update((v) => v + 1);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.cocktailId = +id;
      this.cocktailService.getById(this.cocktailId).subscribe({
        next: (cocktail) => {
          this.cocktailData = cocktail;
          this.imagePreview = cocktail.imageUrl || null;
          this.cocktailForm.patchValue({
            name: cocktail.nom,
            description: cocktail.description || '',
            price: cocktail.prix,
            category: cocktail.categorie,
            glasswareId: cocktail.glassware?.id ?? cocktail.glasswareId ?? null,
            instructions: cocktail.instructions || '',
          });

          this.saisonnaliteState = {
            saisonnier: cocktail.saisonnier || false,
            moisDebut: cocktail.moisDebut || null,
            moisFin: cocktail.moisFin || null,
          };

          if (cocktail.recipeSteps && cocktail.recipeSteps.length > 0) {
            this.recipeStepsArray.clear();
            cocktail.recipeSteps.forEach((step, index) => {
              this.recipeStepsArray.push(this.createStepFormGroup(step, index + 1));
            });
          } else if (cocktail.ingredients && cocktail.ingredients.length > 0) {
            this.recipeStepsArray.clear();
            cocktail.ingredients.forEach((ing: any, index: number) => {
              this.recipeStepsArray.push(
                this.fb.group({
                  stepOrder: [index + 1],
                  stepType: ['INGREDIENT', Validators.required],
                  ingredientId: [ing.ingredient?.id ?? ing.ingredientId ?? null],
                  ingredientNom: [ing.ingredient?.nom ?? ing.ingredientNom ?? ing.nom ?? ''],
                  quantite: [ing.quantite ?? null],
                  unite: [ing.uniteMesure ?? ing.unite ?? 'cl'],
                  templateId: [null],
                  templateName: [''],
                  actionTitle: [''],
                  actionType: ['SHAKE'],
                  customText: [''],
                  durationSeconds: [null],
                })
              );
            });
          }

          if (cocktail.variantes && cocktail.variantes.length > 0) {
            this.variantesArray.clear();
            cocktail.variantes.forEach((v) => {
              this.variantesArray.push(
                this.fb.group({
                  id: [v.id || null],
                  nom: [v.nom, Validators.required],
                  description: [v.description || ''],
                  prixSupplement: [v.prixSupplement || 0, [Validators.required, Validators.min(0)]],
                  multiplicateurIngredient: [v.multiplicateurIngredient || 1.0],
                  disponible: [v.disponible ?? true],
                  instructions: [v.instructions || ''],
                  ingredients: [v.ingredients || []],
                  recipeSteps: [v.recipeSteps || []],
                })
              );
            });
          }
        },
      });
    }
  }

  loadIngredients(): void {
    this.ingredientService.getAll().subscribe({
      next: (data) => this.ingredientsList.set(data),
      error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
    });
  }

  loadTemplates(): void {
    this.templateService.getAll().subscribe({
      next: (data) => this.templatesList.set(data),
      error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
    });
  }

  loadGlassware(): void {
    this.glasswareService.getAll().subscribe({
      next: (data) => this.glasswareList.set(data),
      error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
    });
  }

  // --- Wizard Navigation & Step Validation ---
  isStep1Valid(): boolean {
    const f = this.cocktailForm;
    const name = f.get('name')?.value;
    const price = f.get('price')?.value;
    const cat = f.get('category')?.value;

    const isNameValid = typeof name === 'string' && name.trim().length > 0;
    const isPriceValid = price != null && !Number.isNaN(Number(price)) && Number(price) > 0;
    const isCatValid = cat != null && typeof cat === 'string' && cat.trim().length > 0;

    return isNameValid && isPriceValid && isCatValid;
  }

  private isStepItemValid(ctrl: AbstractControl): boolean {
    const stepType = ctrl.get('stepType')?.value;
    if (stepType === 'INGREDIENT') {
      const ingId = ctrl.get('ingredientId')?.value;
      const qty = ctrl.get('quantite')?.value;
      return Boolean(ingId) && qty != null && !Number.isNaN(Number(qty)) && Number(qty) > 0;
    }
    if (stepType === 'ACTION_TEMPLATE') {
      const templateId = ctrl.get('templateId')?.value;
      const templateName = ctrl.get('templateName')?.value?.trim();
      return Boolean(templateId || templateName);
    }
    if (stepType === 'CUSTOM_TEXT') {
      const actionTitle = ctrl.get('actionTitle')?.value?.trim();
      return Boolean(actionTitle);
    }
    return true;
  }

  isStep2Valid(): boolean {
    if (!this.isStep1Valid()) return false;
    return this.recipeStepsArray.controls.every((ctrl) => this.isStepItemValid(ctrl));
  }

  isStep3Valid(): boolean {
    if (!this.isStep2Valid()) return false;
    for (const ctrl of this.variantesArray.controls) {
      const nom = ctrl.get('nom')?.value;
      const supp = ctrl.get('prixSupplement')?.value;
      if (!nom || typeof nom !== 'string' || !nom.trim() || supp == null || Number.isNaN(Number(supp)) || Number(supp) < 0) {
        return false;
      }
    }
    return true;
  }

  isFormValid(): boolean {
    return this.isStep3Valid();
  }

  canGoToStep(targetStep: number): boolean {
    if (targetStep < 1 || targetStep > this.totalSteps) {
      return false;
    }
    if (targetStep <= this.currentStep()) {
      return true;
    }
    if (targetStep === 2) {
      return this.isStep1Valid();
    }
    if (targetStep === 3) {
      return this.isStep2Valid();
    }
    if (targetStep === 4) {
      return this.isStep3Valid();
    }
    return false;
  }

  canProceedFromCurrentStep(): boolean {
    const step = this.currentStep();
    if (step === 1) return this.isStep1Valid();
    if (step === 2) return this.isStep2Valid();
    if (step === 3) return this.isStep3Valid();
    return true;
  }

  goToStep(step: number): void {
    if (this.canGoToStep(step)) {
      this.currentStep.set(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.showToast(this.transloco.translate('COCKTAILS.WIZARD.VALIDATION_ERROR'), 'warning');
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.goToStep(this.currentStep() + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.goToStep(this.currentStep() - 1);
    }
  }

  // --- Step 2: Recipe Block Builder Helpers ---
  addIngredientStep(): void {
    const order = this.recipeStepsArray.length + 1;
    this.recipeStepsArray.push(
      this.fb.group({
        stepOrder: [order],
        stepType: ['INGREDIENT', Validators.required],
        ingredientId: [null, Validators.required],
        ingredientNom: [''],
        quantite: [4, [Validators.required, Validators.min(0.1)]],
        unite: ['cl'],
        templateId: [null],
        actionTitle: [null],
        actionType: [null],
        customText: [''],
        durationSeconds: [null],
      })
    );
  }

  addIngredientBlock(): void {
    this.addIngredientStep();
  }

  addActionTemplateStep(): void {
    const order = this.recipeStepsArray.length + 1;
    this.recipeStepsArray.push(
      this.fb.group({
        stepOrder: [order],
        stepType: ['ACTION_TEMPLATE', Validators.required],
        ingredientId: [null],
        ingredientNom: [''],
        quantite: [null],
        unite: [null],
        templateId: [null, Validators.required],
        templateName: [''],
        actionTitle: [null],
        actionType: ['SHAKE'],
        customText: [''],
        durationSeconds: [15],
      })
    );
  }

  addActionTemplateBlock(template?: RecipeStepTemplate): void {
    this.addActionTemplateStep();
    if (template) {
      const lastGroup = this.recipeStepsArray.at(-1) as FormGroup;
      this.onTemplateSelected(template.id, lastGroup);
    }
  }

  addCustomTextStep(): void {
    const order = this.recipeStepsArray.length + 1;
    this.recipeStepsArray.push(
      this.fb.group({
        stepOrder: [order],
        stepType: ['CUSTOM_TEXT', Validators.required],
        ingredientId: [null],
        ingredientNom: [''],
        quantite: [null],
        unite: [null],
        templateId: [null],
        actionTitle: ['', Validators.required],
        actionType: ['OTHER'],
        customText: [''],
        durationSeconds: [null],
      })
    );
  }

  addCustomTextBlock(): void {
    this.addCustomTextStep();
  }

  removeRecipeStep(index: number): void {
    this.recipeStepsArray.removeAt(index);
    this.reorderSteps();
  }

  removeStep(index: number): void {
    this.removeRecipeStep(index);
  }

  moveStepUp(index: number): void {
    if (index === 0) return;
    const current = this.recipeStepsArray.at(index);
    this.recipeStepsArray.removeAt(index);
    this.recipeStepsArray.insert(index - 1, current);
    this.reorderSteps();
  }

  moveStepDown(index: number): void {
    if (index >= this.recipeStepsArray.length - 1) return;
    const current = this.recipeStepsArray.at(index);
    this.recipeStepsArray.removeAt(index);
    this.recipeStepsArray.insert(index + 1, current);
    this.reorderSteps();
  }

  private reorderSteps(): void {
    this.recipeStepsArray.controls.forEach((group, idx) => {
      group.get('stepOrder')?.setValue(idx + 1);
    });
  }

  onIngredientSelected(ingId: any, stepGroup: FormGroup): void {
    const selected = this.ingredientsList().find((i) => i.id === +ingId);
    if (selected) {
      stepGroup.patchValue({
        ingredientId: selected.id,
        ingredientNom: selected.nom,
        unite: selected.uniteMesure || 'cl',
      });
    }
  }

  onIngredientOptionSelected(index: number, option: any): void {
    const group = this.recipeStepsArray.at(index) as FormGroup;
    const value = option && typeof option === 'object' && 'value' in option ? option.value : option;
    this.onIngredientSelected(value, group);
  }

  onTemplateSelected(tplId: any, stepGroup: FormGroup): void {
    const selected = this.templatesList().find((t) => t.id === +tplId);
    if (selected) {
      stepGroup.patchValue({
        templateId: selected.id,
        templateName: selected.name,
        actionType: selected.actionType,
        durationSeconds: selected.defaultDurationSeconds || null,
        customText: selected.description || '',
      });
    }
  }

  onTemplateOptionSelected(index: number, option: any): void {
    const group = this.recipeStepsArray.at(index) as FormGroup;
    const value = option && typeof option === 'object' && 'value' in option ? option.value : option;
    this.onTemplateSelected(value, group);
  }

  private createStepFormGroup(step: CocktailRecipeStep, order: number): FormGroup {
    return this.fb.group({
      stepOrder: [order],
      stepType: [step.stepType, Validators.required],
      ingredientId: [step.ingredientId || null],
      ingredientNom: [step.ingredientNom || ''],
      quantite: [step.quantite || null],
      unite: [step.unite || 'cl'],
      templateId: [step.templateId || null],
      templateName: [step.templateName || ''],
      actionTitle: [step.actionTitle || ''],
      actionType: [step.actionType || 'SHAKE'],
      customText: [step.customText || ''],
      durationSeconds: [step.durationSeconds || null],
    });
  }

  // --- Step 3: Variants Management ---
  getBaseIngredientsForVariant(): CocktailIngredientItem[] {
    const steps = this.recipeStepsArray.value || [];
    return steps
      .filter((s: any) => s.stepType === 'INGREDIENT' && s.ingredientId)
      .map((s: any, idx: number) => {
        const cat = this.ingredientsList().find((i) => i.id === +s.ingredientId);
        return {
          id: idx + 1,
          ingredientId: +s.ingredientId,
          ingredientNom: cat ? cat.nom : 'Ingrédient',
          quantite: s.quantite != null ? +s.quantite : 0,
          uniteMesure: s.unite || cat?.uniteMesure || 'cl',
        };
      });
  }

  async addVariant(): Promise<void> {
    await this.openVariantRecipeModal();
  }

  async openVariantRecipeModal(index?: number): Promise<void> {
    const isEdit = index !== undefined && index >= 0;
    const existingVal = isEdit ? this.variantesArray.at(index).value : null;

    const modal = await this.modalCtrl.create({
      component: VariantRecipeModalComponent,
      componentProps: {
        variante: existingVal,
        baseCocktailName: this.cocktailForm.get('name')?.value || '',
        baseCocktailPrice: this.cocktailForm.get('price')?.value || 0,
        baseRecipeSteps: this.recipeStepsArray.value || [],
        availableIngredients: this.ingredientsList(),
        availableTemplates: this.templatesList(),
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const groupData = {
        id: data.id ?? null,
        nom: data.nom,
        description: data.description || '',
        prixSupplement: data.prixSupplement ?? 0,
        multiplicateurIngredient: data.multiplicateurIngredient ?? 1.0,
        disponible: data.disponible ?? true,
        instructions: data.instructions || '',
        ingredients: data.ingredients || [],
        recipeSteps: data.recipeSteps || [],
      };

      if (isEdit) {
        this.variantesArray.at(index).patchValue(groupData);
      } else {
        this.variantesArray.push(
          this.fb.group({
            id: [groupData.id],
            nom: [groupData.nom, [Validators.required, Validators.maxLength(100)]],
            description: [groupData.description],
            prixSupplement: [groupData.prixSupplement, [Validators.min(0)]],
            multiplicateurIngredient: [groupData.multiplicateurIngredient],
            disponible: [groupData.disponible],
            instructions: [groupData.instructions],
            ingredients: this.fb.control(groupData.ingredients),
            recipeSteps: this.fb.control(groupData.recipeSteps),
          })
        );
      }
    }
  }

  removeVariant(index: number): void {
    this.variantesArray.removeAt(index);
  }

  hasCustomVariantRecipe(vGroup: AbstractControl): boolean {
    const ingredients = vGroup.get('ingredients')?.value;
    const recipeSteps = vGroup.get('recipeSteps')?.value;
    return (ingredients && ingredients.length > 0) || (recipeSteps && recipeSteps.length > 0);
  }

  getCustomStepsCount(vGroup: AbstractControl): number {
    const recipeSteps = vGroup.get('recipeSteps')?.value;
    if (recipeSteps && recipeSteps.length > 0) {
      return recipeSteps.length;
    }
    const ingredients = vGroup.get('ingredients')?.value;
    if (ingredients && ingredients.length > 0) {
      return ingredients.length;
    }
    return 0;
  }

  // --- Step 4: Portion Scaler & Math ---
  incrementPortions(): void {
    this.previewPortions.update((p) => Math.min(p + 1, 50));
  }

  decrementPortions(): void {
    this.previewPortions.update((p) => Math.max(p - 1, 1));
  }

  getScaledQuantity(baseQty: number | null | undefined): string {
    if (baseQty == null || Number.isNaN(Number(baseQty))) return '-';
    const scaled = Number(baseQty) * this.previewPortions();
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  }

  // --- Glassware Creation Modal ---
  openCreateGlasswareModal(): void {
    this.newGlasswareNom = '';
    this.newGlasswareContenanceCl = 30;
    this.newGlasswareImageUrl = 'assets/images/verres/verre_tumbler.png';
    this.newGlasswareDescription = '';
    this.newGlasswareSourceType.set('PRESET');
    this.customGlasswareFile = null;
    this.customGlasswarePreview.set(null);
    this.isNewGlasswareModalOpen.set(true);
  }

  closeCreateGlasswareModal(): void {
    this.isNewGlasswareModalOpen.set(false);
  }

  setGlasswareSourceType(type: 'PRESET' | 'CUSTOM'): void {
    this.newGlasswareSourceType.set(type);
  }

  onCustomGlasswareFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.customGlasswareFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.customGlasswarePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeCustomGlasswareFile(): void {
    this.customGlasswareFile = null;
    this.customGlasswarePreview.set(null);
  }

  saveNewGlassware(): void {
    if (!this.newGlasswareNom.trim() || !this.newGlasswareContenanceCl || this.newGlasswareContenanceCl <= 0) {
      return;
    }

    const payloadImageUrl = this.newGlasswareSourceType() === 'PRESET'
      ? this.newGlasswareImageUrl
      : 'assets/images/verres/verre_tumbler.png';

    this.glasswareService
      .create({
        nom: this.newGlasswareNom.trim(),
        contenanceCl: this.newGlasswareContenanceCl,
        imageUrl: payloadImageUrl,
        description: this.newGlasswareDescription.trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          if (this.newGlasswareSourceType() === 'CUSTOM' && this.customGlasswareFile) {
            this.glasswareService.uploadImage(created.id, this.customGlasswareFile).subscribe({
              next: (withImage) => {
                this.glasswareList.update((list) => [...list, withImage]);
                this.cocktailForm.get('glasswareId')?.setValue(withImage.id);
                this.recipeVersion.update((v) => v + 1);
                this.closeCreateGlasswareModal();
                this.showToast(this.transloco.translate('COCKTAILS.GLASSWARE.SAVED_SUCCESS'));
              },
              error: () => {
                this.glasswareList.update((list) => [...list, created]);
                this.cocktailForm.get('glasswareId')?.setValue(created.id);
                this.recipeVersion.update((v) => v + 1);
                this.closeCreateGlasswareModal();
                this.showToast(this.transloco.translate('COCKTAILS.GLASSWARE.SAVED_SUCCESS'));
              },
            });
          } else {
            this.glasswareList.update((list) => [...list, created]);
            this.cocktailForm.get('glasswareId')?.setValue(created.id);
            this.recipeVersion.update((v) => v + 1);
            this.closeCreateGlasswareModal();
            this.showToast(this.transloco.translate('COCKTAILS.GLASSWARE.SAVED_SUCCESS'));
          }
        },
        error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
      });
  }

  // --- Action Template Creation Modal ---
  openCreateTemplateModal(): void {
    this.newTemplateName = '';
    this.newTemplateActionType = 'SHAKE';
    this.newTemplateDuration = 15;
    this.newTemplateIcon = 'wine-outline';
    this.newTemplateDescription = '';
    this.isNewTemplateModalOpen.set(true);
  }

  closeCreateTemplateModal(): void {
    this.isNewTemplateModalOpen.set(false);
  }

  onModalActionTypeSelected(actionType: any): void {
    const value = actionType && typeof actionType === 'object' && 'value' in actionType ? actionType.value : actionType;
    this.newTemplateActionType = value as RecipeStepActionType;
    this.newTemplateIcon = this.getActionIcon(this.newTemplateActionType);
  }

  saveNewTemplate(): void {
    if (!this.newTemplateName.trim()) return;

    this.templateService
      .create({
        name: this.newTemplateName.trim(),
        actionType: this.newTemplateActionType,
        defaultDurationSeconds: this.newTemplateDuration,
        icon: this.newTemplateIcon,
        description: this.newTemplateDescription.trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          this.templatesList.update((list) => [...list, created]);
          this.closeCreateTemplateModal();
          this.showToast(this.transloco.translate('COCKTAILS.BUILDER.TEMPLATE_SAVED_SUCCESS'));
        },
        error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
      });
  }

  getActionIcon(actionType: string | undefined | null): string {
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

  // --- Photo Upload ---
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  saisonnaliteState = {
    saisonnier: false,
    moisDebut: null as number | null,
    moisFin: null as number | null,
  };

  onSeasonalityChange(state: { saisonnier: boolean; moisDebut: number | null; moisFin: number | null }): void {
    this.saisonnaliteState = state;
  }

  onSaisonnaliteUpdated(updatedCocktail: Cocktail): void {
    this.cocktailData = updatedCocktail;
    this.saisonnaliteState = {
      saisonnier: updatedCocktail.saisonnier || false,
      moisDebut: updatedCocktail.moisDebut || null,
      moisFin: updatedCocktail.moisFin || null,
    };
    this.showToast(this.transloco.translate('COMMON.SUCCESS'));
  }

  private async showToast(message: string, color = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color });
    await toast.present();
  }

  // --- Final Form Submission ---
  onSubmit(): void {
    if (this.cocktailForm.invalid) {
      this.goToStep(1);
      return;
    }

    const formVal = this.cocktailForm.value;

    const recipeStepsPayload: CocktailRecipeStepRequest[] = (formVal.recipeSteps || []).map(
      (step: any, idx: number) => ({
        stepOrder: idx + 1,
        stepType: step.stepType,
        ingredientId: step.ingredientId || null,
        quantite: step.quantite != null ? +step.quantite : null,
        unite: step.unite || null,
        templateId: step.templateId || null,
        actionTitle: step.actionTitle || null,
        customText: step.customText || null,
        durationSeconds: step.durationSeconds != null ? +step.durationSeconds : null,
      })
    );

    const variantesPayload = (formVal.variantes || []).map((v: any) => ({
      id: v.id || null,
      nom: v.nom,
      description: v.description || null,
      prixSupplement: v.prixSupplement != null ? +v.prixSupplement : 0,
      multiplicateurIngredient: v.multiplicateurIngredient != null ? +v.multiplicateurIngredient : 1.0,
      disponible: v.disponible ?? true,
      instructions: v.instructions || null,
      recipeSteps: (v.recipeSteps || []).map((step: any, sIdx: number) => ({
        stepOrder: sIdx + 1,
        stepType: step.stepType,
        ingredientId: step.ingredientId || null,
        quantite: step.quantite != null ? +step.quantite : null,
        unite: step.unite || null,
        templateId: step.templateId || null,
        actionTitle: step.actionTitle || null,
        customText: step.customText || null,
        durationSeconds: step.durationSeconds != null ? +step.durationSeconds : null,
      })),
      ingredients: (v.ingredients || []).map((ing: any) => ({
        ingredientId: +ing.ingredientId,
        ingredientNom: ing.ingredientNom,
        quantite: +ing.quantite,
        unite: ing.unite || 'cl',
        notes: ing.notes || null,
      })),
    }));

    const payload = {
      nom: formVal.name,
      description: formVal.description || null,
      prix: formVal.price,
      categorie: formVal.category,
      glasswareId: formVal.glasswareId ? +formVal.glasswareId : null,
      instructions: formVal.instructions || null,
      disponible: this.cocktailData ? this.cocktailData.disponible : true,
      saisonnier: this.saisonnaliteState.saisonnier,
      dateDebutSaison: this.cocktailData?.dateDebutSaison || null,
      dateFinSaison: this.cocktailData?.dateFinSaison || null,
      moisDebut: this.saisonnaliteState.moisDebut,
      moisFin: this.saisonnaliteState.moisFin,
      recipeSteps: recipeStepsPayload,
      variantes: variantesPayload,
    };

    const obs$ = this.isEditMode
      ? this.cocktailService.update(this.cocktailId!, payload as any)
      : this.cocktailService.create(payload as any);

    obs$
      .pipe(
        switchMap((savedCocktail) => {
          if (this.selectedFile && savedCocktail?.id) {
            return this.cocktailService.uploadImage(savedCocktail.id, this.selectedFile);
          }
          return of(savedCocktail);
        })
      )
      .subscribe({
        next: () => {
          this.showToast(this.transloco.translate('COMMON.SUCCESS'));
          this.router.navigate(['/cocktails']);
        },
        error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
      });
  }
}
