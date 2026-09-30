import { Component, Input, OnInit, OnDestroy, Optional, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl } from '@angular/forms';
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
  sparklesOutline,
  barcodeOutline,
  businessOutline,
  addOutline,
  cartOutline,
  informationCircleOutline,
  trashOutline,
  addCircleOutline,
  helpCircleOutline,
  lockClosedOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import {
  Ingredient,
  Allergen,
  ConfectionSource,
  DEFAULT_ALLERGEN_OPTIONS,
  INGREDIENT_UNIT_CONFIG,
  INGREDIENT_CATEGORY_CONFIG
} from '../../../core/models/ingredient.model';
import { InputFieldComponent } from '../../../core/components/ui/input-field/input-field.component';
import {
  SearchableSelectComponent,
  SearchableOption
} from '../../../core/components/ui/searchable-select/searchable-select.component';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';
import { ToggleSwitchComponent } from '../../../core/components/ui/toggle-switch/toggle-switch.component';

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
    ToggleSwitchComponent,
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

  /** Compact unit options for confection yield without verbose multiline sublabel. */
  get yieldUnitOptions(): SearchableOption<string>[] {
    return INGREDIENT_UNIT_CONFIG.map(u => ({
      value: u.value,
      label: this.transloco.translate(`INGREDIENTS.UNITS.${u.key}.LABEL`),
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

  /** All non-crafted ingredients available as confection sources. */
  allIngredients: Ingredient[] = [];

  /** SearchableOption list for confection source ingredient picker (excludes self to prevent cycles). */
  get sourceIngredientOptions(): SearchableOption<number>[] {
    return this.allIngredients
      .filter(ing => !this.ingredientId || ing.id !== this.ingredientId)
      .map(ing => ({
        value: ing.id,
        label: ing.nom,
        badge: ing.uniteMesure,
        badgeType: 'neutral'
      }));
  }

  private readonly featureFlagService = inject(FeatureFlagService);
  readonly suppliersManagementEnabled = this.featureFlagService.suppliersManagementEnabled;

  supplierOptions: SearchableOption<number>[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastCtrl: ToastController,
    private readonly ingredientService: IngredientService,
    private readonly supplierService: SupplierService,
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
      sparklesOutline,
      barcodeOutline,
      businessOutline,
      addOutline,
      cartOutline,
      informationCircleOutline,
      trashOutline,
      addCircleOutline,
      helpCircleOutline,
      lockClosedOutline
    });

    this.ingredientForm = this.fb.group({
      nom: ['', [Validators.required]],
      category: ['other', [Validators.required]],
      uniteMesure: ['', [Validators.required]],
      quantiteStock: [0, [Validators.required, Validators.min(0)]],
      seuilAlerte: [5, [Validators.required, Validators.min(0)]],
      prixUnitaire: [0, [Validators.min(0)]],
      degreAlcool: [0, [Validators.min(0), Validators.max(100)]],
      defaultSupplierId: [null],
      codeBarre: [''],
      isVegan: [true],
      allergens: [[] as Allergen[]],
      purchaseUnit: [''],
      packagingCapacity: [1, [Validators.min(0.001)]],
      packagingPriceHt: [null],
      isCrafted: [false],
      isPurchasable: [true],
      confectionSources: this.fb.array([])
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    if (this.suppliersManagementEnabled()) {
      this.supplierService.getActive().subscribe({
        next: (sups) => {
          this.supplierOptions = sups.map(s => ({
            value: s.id,
            label: s.nom,
            subLabel: s.ville || s.contactNom,
            icon: 'business-outline'
          }));
        },
        error: () => {}
      });
    }

    // Load all ingredients for confection source picker
    this.ingredientService.getAll().subscribe({
      next: (ings) => {
        this.allIngredients = ings;
        this.syncInheritedAllergens();
      },
      error: () => {}
    });

    if (this.ingredient) {
      this.isEditMode = true;
      this.ingredientId = this.ingredient.id;
      const initialAllergens: Allergen[] = this.ingredient.allergens || [];
      this.manualAllergens = new Set<Allergen>(initialAllergens);
      this.ingredientForm.patchValue({
        nom: this.ingredient.nom,
        category: this.ingredient.category || 'other',
        uniteMesure: this.ingredient.uniteMesure,
        quantiteStock: this.ingredient.quantiteStock,
        seuilAlerte: this.ingredient.seuilAlerte,
        prixUnitaire: this.ingredient.prixUnitaire ?? this.ingredient.unitCost ?? 0,
        degreAlcool: this.ingredient.degreAlcool ?? 0,
        defaultSupplierId: this.ingredient.defaultSupplierId ?? null,
        codeBarre: this.ingredient.codeBarre ?? '',
        isVegan: this.ingredient.isVegan ?? true,
        allergens: initialAllergens,
        purchaseUnit: this.ingredient.purchaseUnit ?? '',
        packagingCapacity: this.ingredient.packagingCapacity ?? 1,
        packagingPriceHt: this.ingredient.packagingPriceHt ?? null,
        isCrafted: this.ingredient.isCrafted ?? false,
        isPurchasable: this.ingredient.isPurchasable ?? true
      });
      if (this.ingredient.confectionSources?.length) {
        this.ingredient.confectionSources.forEach(s => this.addConfectionSource(s));
      }
      this.syncInheritedAllergens();
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
        void this.router.navigate(['/404']);
        return;
      }
      this.ingredientService.getById(this.ingredientId).subscribe({
        next: (ingredient) => {
          const initialAllergens: Allergen[] = ingredient.allergens || [];
          this.manualAllergens = new Set<Allergen>(initialAllergens);
          this.ingredientForm.patchValue({
            nom: ingredient.nom,
            category: ingredient.category || 'other',
            uniteMesure: ingredient.uniteMesure,
            quantiteStock: ingredient.quantiteStock,
            seuilAlerte: ingredient.seuilAlerte,
            prixUnitaire: ingredient.prixUnitaire ?? ingredient.unitCost ?? 0,
            degreAlcool: ingredient.degreAlcool ?? 0,
            defaultSupplierId: ingredient.defaultSupplierId ?? null,
            codeBarre: ingredient.codeBarre ?? '',
            isVegan: ingredient.isVegan ?? true,
            allergens: initialAllergens,
            purchaseUnit: ingredient.purchaseUnit ?? '',
            packagingCapacity: ingredient.packagingCapacity ?? 1,
            packagingPriceHt: ingredient.packagingPriceHt ?? null,
            isCrafted: ingredient.isCrafted ?? false,
            isPurchasable: ingredient.isPurchasable ?? true
          });
          if (ingredient.confectionSources?.length) {
            ingredient.confectionSources.forEach(s => this.addConfectionSource(s));
          }
          this.syncInheritedAllergens();
          if (!this.canEdit) {
            this.ingredientForm.disable();
          }
        },
        error: () => {
          void this.router.navigate(['/404']);
        }
      });
    }
  }

  /**
   * Opens barcode and QR code scanner modal to populate barcode field.
   */
  async scanBarcode(): Promise<void> {
    if (!this.canEdit) return;
    if (!this.modalCtrl) return;

    const modal = await this.modalCtrl.create({
      component: BarcodeScannerModalComponent,
      componentProps: {
        title: 'SCANNER.SCAN_INGREDIENT_TITLE',
        subtitle: 'SCANNER.SCAN_INGREDIENT_SUBTITLE'
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<BarcodeScannerResult>();

    if (data && !data.cancelled && data.barcode) {
      this.ingredientForm.patchValue({ codeBarre: data.barcode });
      this.ingredientForm.markAsDirty();
    }
  }

  get formTitleKey(): string {
    if (!this.isEditMode) return 'INGREDIENTS.NEW_TITLE';
    return this.canEdit ? 'INGREDIENTS.EDIT_TITLE' : 'INGREDIENTS.DETAILS_TITLE';
  }

  /** Allergens explicitly selected by the user (independent of source ingredients). */
  manualAllergens = new Set<Allergen>();

  /** Set of allergens inherited from current confection source ingredients. */
  get inheritedAllergens(): Set<Allergen> {
    const isCrafted = !!this.ingredientForm?.get('isCrafted')?.value;
    if (!isCrafted) {
      return new Set<Allergen>();
    }
    const sources = this.confectionSources?.controls || [];
    const inherited = new Set<Allergen>();

    for (const ctrl of sources) {
      const sourceId = ctrl.get('sourceIngredientId')?.value;
      if (!sourceId) continue;
      const source = this.allIngredients.find(i => i.id === +sourceId);
      if (source?.allergens?.length) {
        for (const allergen of source.allergens) {
          inherited.add(allergen);
        }
      }
    }
    return inherited;
  }

  /** Checks whether an allergen is mandatorily inherited from a confection source. */
  isAllergenInherited(key: Allergen): boolean {
    return this.inheritedAllergens.has(key);
  }

  /** Returns true if at least one allergen is inherited from confection sources. */
  get hasInheritedAllergens(): boolean {
    return this.inheritedAllergens.size > 0;
  }

  /**
   * Returns true if vegan status cannot be enabled because of source ingredients
   * (either animal allergens present or source is non-vegan).
   */
  get isVeganLockedFalse(): boolean {
    const isCrafted = !!this.ingredientForm?.get('isCrafted')?.value;
    if (!isCrafted) return false;
    if (this.inheritedAllergens.has('LAIT') || this.inheritedAllergens.has('OEUF')) {
      return true;
    }
    for (const ctrl of this.confectionSources?.controls || []) {
      const sourceId = ctrl.get('sourceIngredientId')?.value;
      if (!sourceId) continue;
      const source = this.allIngredients.find(i => i.id === +sourceId);
      if (source?.isVegan === false) {
        return true;
      }
    }
    return false;
  }

  /**
   * Synchronizes allergens and vegan state with inherited source ingredients.
   * Mandatorily includes any allergens present in source ingredients and locks them.
   */
  syncInheritedAllergens(): void {
    const inherited = this.inheritedAllergens;
    const combined = Array.from(new Set([...this.manualAllergens, ...inherited]));
    this.ingredientForm?.patchValue({ allergens: combined });

    if (combined.includes('LAIT') || combined.includes('OEUF') || this.isVeganLockedFalse) {
      this.ingredientForm?.patchValue({ isVegan: false });
    }
  }

  /**
   * Toggles the vegan flag for the ingredient.
   * If toggled to vegan, automatically removes animal-based allergens (LAIT, OEUF).
   */
  toggleVegan(): void {
    if (!this.canEdit || this.isVeganLockedFalse) return;
    const current = !!this.ingredientForm.get('isVegan')?.value;
    const nextVal = !current;
    this.ingredientForm.patchValue({ isVegan: nextVal });
    if (nextVal) {
      const currentAllergens: Allergen[] = this.ingredientForm.get('allergens')?.value || [];
      for (const a of currentAllergens) {
        if (!this.isAllergenInherited(a)) {
          this.manualAllergens.add(a);
        }
      }
      this.manualAllergens.delete('LAIT');
      this.manualAllergens.delete('OEUF');
      this.syncInheritedAllergens();
    }
    this.ingredientForm.markAsDirty();
  }

  isAllergenSelected(key: Allergen): boolean {
    const list: Allergen[] = this.ingredientForm.get('allergens')?.value || [];
    return list.includes(key);
  }

  toggleAllergen(key: Allergen): void {
    if (!this.canEdit || this.isAllergenInherited(key)) return;
    const currentAllergens: Allergen[] = this.ingredientForm.get('allergens')?.value || [];
    if (currentAllergens.length > 0 && this.manualAllergens.size === 0) {
      for (const a of currentAllergens) {
        if (!this.isAllergenInherited(a)) {
          this.manualAllergens.add(a);
        }
      }
    }
    if (this.manualAllergens.has(key)) {
      this.manualAllergens.delete(key);
    } else {
      this.manualAllergens.add(key);
    }
    this.syncInheritedAllergens();
    this.ingredientForm.markAsDirty();
  }

  /** Accessor for the confectionSources FormArray. */
  get confectionSources(): FormArray {
    return this.ingredientForm.get('confectionSources') as FormArray;
  }

  /**
   * Builds a new FormGroup row for a confection source entry.
   *
   * @param source Optional existing confection source data for pre-filling on edit
   */
  private buildConfectionSourceGroup(source?: Partial<ConfectionSource>): FormGroup {
    return this.fb.group({
      sourceIngredientId: [source?.sourceIngredientId ?? null, Validators.required],
      yieldRatio: [source?.yieldRatio ?? null, [Validators.required, Validators.min(0.0001)]],
      yieldUnit: [source?.yieldUnit ?? ''],
      notes: [source?.notes ?? '']
    });
  }

  /**
   * Appends a new confection source row to the FormArray.
   *
   * @param source Optional prefill data (used when loading existing ingredient)
   */
  addConfectionSource(source?: Partial<ConfectionSource>): void {
    this.confectionSources.push(this.buildConfectionSourceGroup(source));
    this.syncInheritedAllergens();
    this.ingredientForm.markAsDirty();
  }

  /**
   * Removes a confection source row from the FormArray at the given index.
   *
   * @param index Index of the row to remove
   */
  removeConfectionSource(index: number): void {
    this.confectionSources.removeAt(index);
    this.syncInheritedAllergens();
    this.ingredientForm.markAsDirty();
  }

  /**
   * Automatically sets default yield unit to selected source ingredient's unit if not set.
   *
   * @param index Index of the confection source row
   * @param option The selected source ingredient option
   */
  onSourceSelectionChange(index: number, option: SearchableOption<number> | null): void {
    const row = this.confectionSources.at(index);
    if (!row) return;
    if (option) {
      row.patchValue({ sourceIngredientId: option.value });
      const currentUnit = row.get('yieldUnit')?.value;
      const unitValue = option.badge || option.subLabel;
      if (!currentUnit && unitValue) {
        row.patchValue({ yieldUnit: unitValue });
      }
    } else {
      row.patchValue({ sourceIngredientId: null });
    }
    this.syncInheritedAllergens();
    this.ingredientForm.markAsDirty();
  }

  /**
   * Generates a dynamic explanation string describing the confection yield and stock deduction.
   *
   * @param sourceGroup The FormGroup representing the confection source row
   * @return Localized explanation sentence
   */
  getYieldExplanation(sourceGroup: AbstractControl): string {
    const sourceId = sourceGroup.get('sourceIngredientId')?.value;
    const ratio = sourceGroup.get('yieldRatio')?.value;
    const unit = sourceGroup.get('yieldUnit')?.value;
    if (!sourceId || !ratio) {
      return this.transloco.translate('INGREDIENTS.CONFECTION.YIELD_HINT_DEFAULT');
    }
    const source = this.allIngredients.find(i => i.id === sourceId);
    const sourceName = source ? source.nom : 'l\'ingrédient source';
    const craftedUnit = this.ingredientForm.get('uniteMesure')?.value || 'unité';
    const yieldUnit = unit || (source ? source.uniteMesure : 'unité');
    return this.transloco.translate('INGREDIENTS.CONFECTION.YIELD_EXPLANATION', {
      craftedUnit,
      ratio,
      yieldUnit,
      sourceName
    });
  }

  /**
   * Handles the isCrafted toggle.
   * When disabled, clears all confection sources and resets isPurchasable to true.
   * When enabled and sources list is empty, automatically adds a first empty source row.
   */
  onIsCraftedChange(value: boolean): void {
    if (this.ingredientForm.get('isCrafted')?.value !== value) {
      this.ingredientForm.patchValue({ isCrafted: value });
    }
    if (!value) {
      this.confectionSources.clear();
      this.ingredientForm.patchValue({ isPurchasable: true });
    } else if (this.confectionSources.length === 0) {
      this.addConfectionSource();
    }
    this.syncInheritedAllergens();
    this.ingredientForm.markAsDirty();
  }

  onSubmit(): void {
    if (this.ingredientForm.invalid || !this.canEdit) return;
    const raw = this.ingredientForm.value;
    const payload = {
      ...raw,
      confectionSources: (raw.confectionSources as ConfectionSource[]) ?? []
    };
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
        await toast.present();

        if (this.modalCtrl) {
          await this.modalCtrl.dismiss(savedResult ?? payload, 'saved');
        } else {
          await this.router.navigate(['/ingredients']);
        }
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: this.transloco.translate('COMMON.ERROR'),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async onCancel(): Promise<void> {
    if (this.modalCtrl) {
      try {
        await this.modalCtrl.dismiss(null, 'cancel');
      } catch {
        await this.router.navigate(['/ingredients']);
      }
    } else {
      await this.router.navigate(['/ingredients']);
    }
  }
}
