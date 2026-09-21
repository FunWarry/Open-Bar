import { Component, Input, OnInit, OnDestroy, Optional, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
  ToastController,
  ModalController,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  layersOutline,
  warningOutline,
  scaleOutline,
  checkmarkCircle,
  closeOutline,
  arrowBackOutline,
  cashOutline,
  nutritionOutline,
  leafOutline,
  eggOutline,
  wineOutline,
  pricetagOutline,
  flaskOutline,
  colorFillOutline,
  beerOutline,
  waterOutline,
  sparklesOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import {
  Ingredient,
  Allergen,
  DEFAULT_ALLERGEN_OPTIONS,
  INGREDIENT_UNIT_CONFIG,
  INGREDIENT_CATEGORY_CONFIG
} from '../../../core/models/ingredient.model';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import {
  SearchableSelectComponent,
  SearchableOption
} from '../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Form and detail modal component for creating, viewing, or editing an Ingredient entity in OpenBar.
 * Conforms to Figma Design System with InputFieldComponent, SearchableSelectComponent and Transloco i18n.
 * Can be opened as an Ionic modal dialog or as a standalone route.
 */
@Component({
  selector: 'app-ingredient-form',
  templateUrl: './ingredient-form.component.html',
  styleUrls: ['./ingredient-form.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    SearchableSelectComponent,
    InputFieldComponent,
    ReactiveFormsModule,
    TranslocoModule
  ]
})
export class IngredientFormComponent implements OnInit, OnDestroy {
  @Input() ingredient: Ingredient | null = null;
  @Input() canEdit = true;

  ingredientForm: FormGroup;
  isEditMode = false;
  ingredientId: number | null = null;
  private readonly destroy$ = new Subject<void>();

  /** Standard unit options with localized labels, sublabels, badges and mixology icons. */
  get unitOptions(): SearchableOption<string>[] {
    return INGREDIENT_UNIT_CONFIG.map(u => ({
      value: u.value,
      label: this.transloco.translate(`INGREDIENTS.UNITS.${u.key}.LABEL`),
      subLabel: this.transloco.translate(`INGREDIENTS.UNITS.${u.key}.SUBLABEL`),
      badge: this.transloco.translate(`INGREDIENTS.UNITS.${u.key}.BADGE`),
      badgeType: u.badgeType,
      icon: u.icon
    }));
  }

  /** Predefined mixology category options with Transloco translation keys and icons. */
  get categoryOptions(): SearchableOption<string>[] {
    return INGREDIENT_CATEGORY_CONFIG.map(cat => ({
      value: cat.key,
      label: this.transloco.translate(cat.labelKey),
      icon: cat.icon
    }));
  }

  readonly availableAllergens = DEFAULT_ALLERGEN_OPTIONS;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastCtrl: ToastController,
    private readonly ingredientService: IngredientService,
    private readonly transloco: TranslocoService,
    @Optional() private readonly modalCtrl?: ModalController
  ) {
    addIcons({
      cubeOutline,
      layersOutline,
      warningOutline,
      scaleOutline,
      checkmarkCircle,
      closeOutline,
      arrowBackOutline,
      cashOutline,
      nutritionOutline,
      leafOutline,
      eggOutline,
      wineOutline,
      pricetagOutline,
      flaskOutline,
      colorFillOutline,
      beerOutline,
      waterOutline,
      sparklesOutline
    });

    this.ingredientForm = this.fb.group({
      nom: ['', [Validators.required]],
      category: ['other', [Validators.required]],
      uniteMesure: ['', [Validators.required]],
      quantiteStock: [0, [Validators.required, Validators.min(0)]],
      seuilAlerte: [5, [Validators.required, Validators.min(0)]],
      prixUnitaire: [0, [Validators.min(0)]],
      degreAlcool: [0, [Validators.min(0), Validators.max(100)]],
      isVegan: [true],
      allergens: [[] as Allergen[]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    if (this.ingredient) {
      this.isEditMode = true;
      this.ingredientId = this.ingredient.id;
      this.ingredientForm.patchValue({
        nom: this.ingredient.nom,
        category: this.ingredient.category || 'other',
        uniteMesure: this.ingredient.uniteMesure,
        quantiteStock: this.ingredient.quantiteStock,
        seuilAlerte: this.ingredient.seuilAlerte,
        prixUnitaire: this.ingredient.prixUnitaire ?? this.ingredient.unitCost ?? 0,
        degreAlcool: this.ingredient.degreAlcool ?? 0,
        isVegan: this.ingredient.isVegan ?? true,
        allergens: this.ingredient.allergens || []
      });
      if (!this.canEdit) {
        this.ingredientForm.disable();
      }
      return;
    }

    const id = this.route?.snapshot?.params?.['id'];
    if (id) {
      this.isEditMode = true;
      this.ingredientId = +id;
      if (Number.isNaN(this.ingredientId)) {
        this.router.navigate(['/404']);
        return;
      }
      this.ingredientService.getById(this.ingredientId).subscribe({
        next: (ingredient) => {
          this.ingredientForm.patchValue({
            nom: ingredient.nom,
            category: ingredient.category || 'other',
            uniteMesure: ingredient.uniteMesure,
            quantiteStock: ingredient.quantiteStock,
            seuilAlerte: ingredient.seuilAlerte,
            prixUnitaire: ingredient.prixUnitaire ?? ingredient.unitCost ?? 0,
            degreAlcool: ingredient.degreAlcool ?? 0,
            isVegan: ingredient.isVegan ?? true,
            allergens: ingredient.allergens || []
          });
          if (!this.canEdit) {
            this.ingredientForm.disable();
          }
        },
        error: () => {
          this.router.navigate(['/404']);
        }
      });
    }
  }

  get formTitleKey(): string {
    if (!this.isEditMode) return 'INGREDIENTS.NEW_TITLE';
    return this.canEdit ? 'INGREDIENTS.EDIT_TITLE' : 'INGREDIENTS.DETAILS_TITLE';
  }

  /**
   * Toggles the vegan flag for the ingredient.
   * If toggled to vegan, automatically removes animal-based allergens (LAIT, OEUF).
   */
  toggleVegan(): void {
    if (!this.canEdit) return;
    const current = !!this.ingredientForm.get('isVegan')?.value;
    const nextVal = !current;
    this.ingredientForm.patchValue({ isVegan: nextVal });
    if (nextVal) {
      const currentAllergens: Allergen[] = this.ingredientForm.get('allergens')?.value || [];
      const filtered = currentAllergens.filter((a) => a !== 'LAIT' && a !== 'OEUF');
      if (filtered.length !== currentAllergens.length) {
        this.ingredientForm.patchValue({ allergens: filtered });
      }
    }
    this.ingredientForm.markAsDirty();
  }

  isAllergenSelected(key: Allergen): boolean {
    const list: Allergen[] = this.ingredientForm.get('allergens')?.value || [];
    return list.includes(key);
  }

  toggleAllergen(key: Allergen): void {
    if (!this.canEdit) return;
    const current: Allergen[] = [...(this.ingredientForm.get('allergens')?.value || [])];
    const index = current.indexOf(key);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(key);
    }
    this.ingredientForm.patchValue({ allergens: current });
    if (current.includes('LAIT') || current.includes('OEUF')) {
      this.ingredientForm.patchValue({ isVegan: false });
    }
    this.ingredientForm.markAsDirty();
  }

  onSubmit(): void {
    if (this.ingredientForm.invalid || !this.canEdit) return;
    const payload = this.ingredientForm.value;
    const obs$ = this.isEditMode
      ? this.ingredientService.update(this.ingredientId!, payload)
      : this.ingredientService.create(payload);

    obs$.subscribe({
      next: async (savedResult) => {
        const msgKey = this.isEditMode
          ? 'INGREDIENTS.UPDATED_SUCCESS'
          : 'INGREDIENTS.CREATED_SUCCESS';
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate(msgKey),
          duration: 3000,
          color: 'success'
        });
        toast.present();

        if (this.modalCtrl) {
          await this.modalCtrl.dismiss(savedResult ?? payload, 'saved');
        } else {
          this.router.navigate(['/ingredients']);
        }
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  async onCancel(): Promise<void> {
    if (this.modalCtrl) {
      try {
        await this.modalCtrl.dismiss(null, 'cancel');
      } catch {
        this.router.navigate(['/ingredients']);
      }
    } else {
      this.router.navigate(['/ingredients']);
    }
  }
}
