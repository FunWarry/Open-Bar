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
import { Ingredient, Allergen, DEFAULT_ALLERGEN_OPTIONS } from '../../../core/models/ingredient.model';
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
    return [
      // Volumes liquides
      {
        value: 'cl',
        label: this.transloco.translate('INGREDIENTS.UNITS.CL.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.CL.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.CL.BADGE'),
        badgeType: 'primary',
        icon: 'scale-outline'
      },
      {
        value: 'ml',
        label: this.transloco.translate('INGREDIENTS.UNITS.ML.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.ML.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.ML.BADGE'),
        badgeType: 'primary',
        icon: 'scale-outline'
      },
      {
        value: 'L',
        label: this.transloco.translate('INGREDIENTS.UNITS.L.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.L.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.L.BADGE'),
        badgeType: 'primary',
        icon: 'wine-outline'
      },
      {
        value: 'dash',
        label: this.transloco.translate('INGREDIENTS.UNITS.DASH.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.DASH.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.DASH.BADGE'),
        badgeType: 'warning',
        icon: 'color-fill-outline'
      },
      {
        value: 'goutte',
        label: this.transloco.translate('INGREDIENTS.UNITS.GOUTTE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.GOUTTE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.GOUTTE.BADGE'),
        badgeType: 'primary',
        icon: 'water-outline'
      },
      {
        value: 'cuillère',
        label: this.transloco.translate('INGREDIENTS.UNITS.CUILLERE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.CUILLERE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.CUILLERE.BADGE'),
        badgeType: 'neutral',
        icon: 'sparkles-outline'
      },
      {
        value: 'dose',
        label: this.transloco.translate('INGREDIENTS.UNITS.DOSE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.DOSE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.DOSE.BADGE'),
        badgeType: 'primary',
        icon: 'wine-outline'
      },
      // Masses solides
      {
        value: 'g',
        label: this.transloco.translate('INGREDIENTS.UNITS.G.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.G.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.G.BADGE'),
        badgeType: 'warning',
        icon: 'scale-outline'
      },
      {
        value: 'kg',
        label: this.transloco.translate('INGREDIENTS.UNITS.KG.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.KG.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.KG.BADGE'),
        badgeType: 'warning',
        icon: 'scale-outline'
      },
      {
        value: 'pincée',
        label: this.transloco.translate('INGREDIENTS.UNITS.PINCEE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.PINCEE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.PINCEE.BADGE'),
        badgeType: 'warning',
        icon: 'sparkles-outline'
      },
      // Unités, découpes & contenants
      {
        value: 'pièce',
        label: this.transloco.translate('INGREDIENTS.UNITS.PIECE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.PIECE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.PIECE.BADGE'),
        badgeType: 'success',
        icon: 'cube-outline'
      },
      {
        value: 'morceau',
        label: this.transloco.translate('INGREDIENTS.UNITS.MORCEAU.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.MORCEAU.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.MORCEAU.BADGE'),
        badgeType: 'success',
        icon: 'nutrition-outline'
      },
      {
        value: 'tranche',
        label: this.transloco.translate('INGREDIENTS.UNITS.TRANCHE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.TRANCHE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.TRANCHE.BADGE'),
        badgeType: 'success',
        icon: 'nutrition-outline'
      },
      {
        value: 'zeste',
        label: this.transloco.translate('INGREDIENTS.UNITS.ZESTE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.ZESTE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.ZESTE.BADGE'),
        badgeType: 'success',
        icon: 'leaf-outline'
      },
      {
        value: 'feuille',
        label: this.transloco.translate('INGREDIENTS.UNITS.FEUILLE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.FEUILLE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.FEUILLE.BADGE'),
        badgeType: 'success',
        icon: 'leaf-outline'
      },
      {
        value: 'bouteille',
        label: this.transloco.translate('INGREDIENTS.UNITS.BOUTEILLE.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.BOUTEILLE.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.BOUTEILLE.BADGE'),
        badgeType: 'neutral',
        icon: 'wine-outline'
      },
      {
        value: 'portion',
        label: this.transloco.translate('INGREDIENTS.UNITS.PORTION.LABEL'),
        subLabel: this.transloco.translate('INGREDIENTS.UNITS.PORTION.SUBLABEL'),
        badge: this.transloco.translate('INGREDIENTS.UNITS.PORTION.BADGE'),
        badgeType: 'neutral',
        icon: 'cube-outline'
      }
    ];
  }

  /** Predefined mixology category options with Transloco translation keys and icons. */
  get categoryOptions(): SearchableOption<string>[] {
    return [
      {
        value: 'dark_liquor',
        label: this.transloco.translate('SUNBURST.FAMILIES.DARK_LIQUOR'),
        icon: 'wine-outline'
      },
      {
        value: 'light_liquor',
        label: this.transloco.translate('SUNBURST.FAMILIES.LIGHT_LIQUOR'),
        icon: 'flask-outline'
      },
      {
        value: 'liqueurs',
        label: this.transloco.translate('SUNBURST.FAMILIES.LIQUEURS'),
        icon: 'color-fill-outline'
      },
      {
        value: 'wine_beer',
        label: this.transloco.translate('SUNBURST.FAMILIES.WINE_BEER'),
        icon: 'beer-outline'
      },
      {
        value: 'juices',
        label: this.transloco.translate('SUNBURST.FAMILIES.JUICES'),
        icon: 'water-outline'
      },
      {
        value: 'mixers',
        label: this.transloco.translate('SUNBURST.FAMILIES.MIXERS'),
        icon: 'sparkles-outline'
      },
      {
        value: 'fruits',
        label: this.transloco.translate('SUNBURST.FAMILIES.FRUITS'),
        icon: 'nutrition-outline'
      },
      {
        value: 'herbs',
        label: this.transloco.translate('SUNBURST.FAMILIES.HERBS'),
        icon: 'leaf-outline'
      },
      {
        value: 'bitters',
        label: this.transloco.translate('SUNBURST.FAMILIES.BITTERS'),
        icon: 'flask-outline'
      },
      {
        value: 'other',
        label: this.transloco.translate('SUNBURST.FAMILIES.OTHER'),
        icon: 'cube-outline'
      }
    ];
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
