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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
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
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CocktailService } from '../../../core/services/cocktail.service';
import { IngredientService } from '../../../core/services/ingredient.service';
import { RecipeStepTemplateService } from '../../../core/services/recipe-step-template.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import { Ingredient } from '../../../core/models/ingredient.model';
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
 * Step-by-Step Wizard & Modular Block Cocktail Builder Component.
 * Supports:
 * - Step 1: General Info & Photo Upload & Seasonal Settings
 * - Step 2: Recipe Block Builder (Ingredients, Action Templates, Custom Text)
 * - Step 3: Variants & Service Glassware
 * - Step 4: Interactive Recipe Preview with Live Portion Scaling
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
  private readonly cocktailService = inject(CocktailService);
  private readonly ingredientService = inject(IngredientService);
  private readonly templateService = inject(RecipeStepTemplateService);
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

  // Category options for searchable combobox
  categoryOptions = computed<SearchableOption[]>(() => [
    { value: 'ALCOOLISE', label: this.transloco.translate('COCKTAILS.CATEGORIES.ALCOOLISE'), icon: 'wine-outline' },
    { value: 'SANS_ALCOOL', label: this.transloco.translate('COCKTAILS.CATEGORIES.SANS_ALCOOL'), icon: 'water-outline' },
    { value: 'SHOT', label: this.transloco.translate('COCKTAILS.CATEGORIES.SHOT'), icon: 'flame-outline' },
    { value: 'APERITIF', label: this.transloco.translate('COCKTAILS.CATEGORIES.APERITIF'), icon: 'restaurant-outline' },
    { value: 'DIGESTIF', label: this.transloco.translate('COCKTAILS.CATEGORIES.DIGESTIF'), icon: 'wine-outline' },
    { value: 'SPECIAL', label: this.transloco.translate('COCKTAILS.CATEGORIES.SPECIAL'), icon: 'sparkles-outline' },
  ]);

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

  // Interactive portions count for preview scaling
  previewPortions = signal<number>(1);

  // New reusable template modal state
  isNewTemplateModalOpen = signal<boolean>(false);
  newTemplateName = '';
  newTemplateActionType: RecipeStepActionType = 'SHAKE';
  newTemplateDuration = 15;
  newTemplateIcon = 'wine-outline';
  newTemplateDescription = '';

  cocktailForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    category: ['', Validators.required],
    instructions: [''],
    recipeSteps: this.fb.array([]),
    variantes: this.fb.array([]),
  });

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
            description: cocktail.description,
            price: cocktail.prix,
            category: cocktail.categorie,
            instructions: cocktail.instructions || '',
          });

          if (cocktail.recipeSteps && cocktail.recipeSteps.length > 0) {
            this.recipeStepsArray.clear();
            cocktail.recipeSteps.forEach((step, index) => {
              this.recipeStepsArray.push(this.createStepFormGroup(step, index + 1));
            });
          }

          if (cocktail.variantes && cocktail.variantes.length > 0) {
            this.variantesArray.clear();
            cocktail.variantes.forEach((v) => {
              this.variantesArray.push(
                this.fb.group({
                  nom: [v.nom, Validators.required],
                  description: [v.description || ''],
                  prixSupplement: [v.prixSupplement || 0, [Validators.required, Validators.min(0)]],
                  disponible: [v.disponible ?? true],
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

  // --- Wizard Navigation ---
  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  // --- Block Step Builder Methods ---
  createStepFormGroup(initial?: Partial<CocktailRecipeStep>, order = 1): FormGroup {
    return this.fb.group({
      stepOrder: [initial?.stepOrder || order],
      stepType: [initial?.stepType || 'INGREDIENT', Validators.required],
      ingredientId: [initial?.ingredientId || null],
      ingredientNom: [initial?.ingredientNom || ''],
      quantite: [initial?.quantite || null],
      unite: [initial?.unite || 'cl'],
      templateId: [initial?.templateId || null],
      templateName: [initial?.templateName || ''],
      actionType: [initial?.actionType || 'OTHER'],
      actionTitle: [initial?.actionTitle || ''],
      customText: [initial?.customText || ''],
      durationSeconds: [initial?.durationSeconds || 15],
    });
  }

  addIngredientBlock(): void {
    const order = this.recipeStepsArray.length + 1;
    const group = this.createStepFormGroup(
      {
        stepType: 'INGREDIENT',
        stepOrder: order,
        quantite: 4,
        unite: 'cl',
      },
      order
    );
    this.recipeStepsArray.push(group);
  }

  addActionTemplateBlock(template?: RecipeStepTemplate): void {
    const order = this.recipeStepsArray.length + 1;
    const group = this.createStepFormGroup(
      {
        stepType: 'ACTION_TEMPLATE',
        stepOrder: order,
        templateId: template?.id,
        templateName: template?.name || '',
        actionType: template?.actionType || 'SHAKE',
        durationSeconds: template?.defaultDurationSeconds || 15,
        customText: template?.description || '',
      },
      order
    );
    this.recipeStepsArray.push(group);
  }

  addCustomTextBlock(): void {
    const order = this.recipeStepsArray.length + 1;
    const group = this.createStepFormGroup(
      {
        stepType: 'CUSTOM_TEXT',
        stepOrder: order,
        actionTitle: 'Geste technique personnalisé',
        durationSeconds: 15,
      },
      order
    );
    this.recipeStepsArray.push(group);
  }

  onIngredientOptionSelected(index: number, option: SearchableOption | null): void {
    const stepGroup = this.recipeStepsArray.at(index) as FormGroup;
    if (!stepGroup) return;

    if (!option) {
      stepGroup.patchValue({
        ingredientId: null,
        ingredientNom: '',
      });
      return;
    }

    const ingredient = this.ingredientsList().find((i) => i.id === option.value);
    if (ingredient) {
      stepGroup.patchValue({
        ingredientId: ingredient.id,
        ingredientNom: ingredient.nom,
        unite: ingredient.uniteMesure || 'cl',
      });
    }
  }

  onTemplateOptionSelected(index: number, option: SearchableOption | null): void {
    const stepGroup = this.recipeStepsArray.at(index) as FormGroup;
    if (!stepGroup) return;

    if (!option) {
      stepGroup.patchValue({
        templateId: null,
        templateName: '',
      });
      return;
    }

    const template = this.templatesList().find((t) => t.id === option.value);
    if (template) {
      stepGroup.patchValue({
        templateId: template.id,
        templateName: template.name,
        actionType: template.actionType,
        durationSeconds: template.defaultDurationSeconds,
        customText: template.description || '',
      });
    }
  }

  onModalActionTypeSelected(option: SearchableOption | null): void {
    if (option) {
      this.newTemplateActionType = option.value as RecipeStepActionType;
    }
  }

  removeStep(index: number): void {
    this.recipeStepsArray.removeAt(index);
    this.reindexSteps();
  }

  moveStepUp(index: number): void {
    if (index <= 0) return;
    const current = this.recipeStepsArray.at(index);
    this.recipeStepsArray.removeAt(index);
    this.recipeStepsArray.insert(index - 1, current);
    this.reindexSteps();
  }

  moveStepDown(index: number): void {
    if (index >= this.recipeStepsArray.length - 1) return;
    const current = this.recipeStepsArray.at(index);
    this.recipeStepsArray.removeAt(index);
    this.recipeStepsArray.insert(index + 1, current);
    this.reindexSteps();
  }

  private reindexSteps(): void {
    this.recipeStepsArray.controls.forEach((ctrl, idx) => {
      ctrl.patchValue({ stepOrder: idx + 1 });
    });
  }

  // --- Variants Management ---
  addVariant(): void {
    this.variantesArray.push(
      this.fb.group({
        nom: ['', Validators.required],
        description: [''],
        prixSupplement: [0, [Validators.required, Validators.min(0)]],
        disponible: [true],
      })
    );
  }

  removeVariant(index: number): void {
    this.variantesArray.removeAt(index);
  }

  // --- Reusable Action Template Modal ---
  openCreateTemplateModal(fromStepGroup?: AbstractControl | null): void {
    if (fromStepGroup) {
      this.newTemplateName = fromStepGroup.get('actionTitle')?.value || '';
      this.newTemplateActionType = fromStepGroup.get('actionType')?.value || 'OTHER';
      this.newTemplateDuration = fromStepGroup.get('durationSeconds')?.value || 15;
      this.newTemplateDescription = fromStepGroup.get('customText')?.value || '';
    } else {
      this.newTemplateName = '';
      this.newTemplateActionType = 'SHAKE';
      this.newTemplateDuration = 15;
      this.newTemplateDescription = '';
    }
    this.isNewTemplateModalOpen.set(true);
  }

  closeCreateTemplateModal(): void {
    this.isNewTemplateModalOpen.set(false);
  }

  saveNewTemplate(): void {
    if (!this.newTemplateName.trim()) return;

    this.templateService
      .create({
        name: this.newTemplateName.trim(),
        actionType: this.newTemplateActionType,
        defaultDurationSeconds: this.newTemplateDuration,
        description: this.newTemplateDescription.trim(),
        icon: this.newTemplateIcon,
      })
      .subscribe({
        next: (saved) => {
          this.templatesList.update((list) => [...list, saved]);
          this.showToast(this.transloco.translate('COCKTAILS.BUILDER.TEMPLATE_SAVED_SUCCESS'));
          this.closeCreateTemplateModal();
        },
        error: () => this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger'),
      });
  }

  // --- Scaling Preview Helpers ---
  incrementPortions(): void {
    this.previewPortions.update((p) => Math.min(p + 1, 50));
  }

  decrementPortions(): void {
    this.previewPortions.update((p) => Math.max(p - 1, 1));
  }

  getScaledQuantity(baseQuantity: number | null | undefined): number {
    if (baseQuantity == null) return 0;
    const total = baseQuantity * this.previewPortions();
    return Math.round(total * 100) / 100;
  }

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
        return 'water-outline';
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

  onSaisonnaliteUpdated(updatedCocktail: Cocktail): void {
    this.cocktailData = updatedCocktail;
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

    const payload = {
      nom: formVal.name,
      description: formVal.description,
      prix: formVal.price,
      categorie: formVal.category,
      instructions: formVal.instructions || null,
      recipeSteps: recipeStepsPayload,
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
