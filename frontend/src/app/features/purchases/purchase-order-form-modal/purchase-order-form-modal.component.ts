import {
  Component,
  Input,
  OnInit,
  OnChanges,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  closeOutline,
  addOutline,
  trashOutline,
  barcodeOutline,
  saveOutline,
  calendarOutline,
  calculatorOutline,
  cubeOutline,
  wineOutline,
  beerOutline,
  leafOutline,
  createOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Supplier } from '../../../core/models/supplier.model';
import { Ingredient } from '../../../core/models/ingredient.model';
import { PurchaseOrder, PurchaseOrderCreateRequest, PurchaseOrderItemRequest } from '../../../core/models/purchase-order.model';
import { IngredientService } from '../../../core/services/ingredient.service';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';

/**
 * Packaging preset option representing a wholesale purchasing format.
 */
export interface PackagingPresetOption {
  label: string;
  unit: string;
  capacity: number;
}

/**
 * Modal dialog for preparing and drafting a supplier purchase order.
 * Features line item calculations, quick ingredient selection via searchable dropdown, and barcode scanning intake.
 */
@Component({
  selector: 'app-purchase-order-form-modal',
  templateUrl: './purchase-order-form-modal.component.html',
  styleUrls: ['./purchase-order-form-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonIcon,
    TranslocoPipe,
    SearchableSelectComponent
  ]
})
export class PurchaseOrderFormModalComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly ingredientService = inject(IngredientService);

  @Input() suppliers: Supplier[] = [];
  @Input() ingredients: Ingredient[] = [];
  @Input() order?: PurchaseOrder;

  form!: FormGroup;
  supplierOptions: SearchableOption<number>[] = [];
  ingredientOptions: SearchableOption<number>[] = [];

  get isEditing(): boolean {
    return !!this.order;
  }

  constructor() {
    addIcons({
      cartOutline,
      closeOutline,
      addOutline,
      trashOutline,
      barcodeOutline,
      saveOutline,
      calculatorOutline,
      calendarOutline,
      cubeOutline,
      wineOutline,
      beerOutline,
      leafOutline,
      createOutline
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.initOptions();

    const defaultSupplierId = this.order?.supplierId ?? (this.suppliers.length > 0 ? this.suppliers[0].id : null);
    const defaultDate = this.order?.dateLivraisonPrevue?.substring(0, 10) ?? '';
    const defaultRef = this.order?.referenceFactureFournisseur ?? '';
    const defaultNotes = this.order?.notes ?? '';

    this.form = this.fb.group({
      supplierId: [defaultSupplierId, [Validators.required]],
      dateLivraisonPrevue: [defaultDate],
      referenceFactureFournisseur: [defaultRef],
      notes: [defaultNotes],
      items: this.fb.array([])
    });

    const orderItems = this.order?.items;
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        const ing = this.ingredients.find(i => i.id === item.ingredientId);
        let cap = item.packagingCapacity;
        let pUnit = item.purchaseUnit;
        if ((!cap || cap <= 1) && ing) {
          const pkg = this.resolvePackagingDetails(ing);
          cap = cap || pkg.capacity;
          pUnit = pUnit || pkg.unit;
        }
        this.addItem(
          item.ingredientId,
          item.prixUnitaireHt,
          item.tauxTva ?? 20,
          item.quantiteCommandee,
          pUnit ?? '',
          cap ?? 1
        );
      }
    } else if (this.items.length === 0) {
      this.addItem();
    }
  }

  ngOnChanges(): void {
    this.initOptions();
  }

  /**
   * Transforms raw suppliers and ingredients into SearchableOption models for the dropdowns.
   */
  private initOptions(): void {
    this.supplierOptions = (this.suppliers || []).map((s) => ({
      value: s.id,
      label: s.nom,
      subLabel: s.email || s.telephone || undefined
    }));

    this.ingredientOptions = (this.ingredients || [])
      .filter((ing) => !ing.isCrafted || ing.isPurchasable)
      .map((ing) => {
        const pkg = this.resolvePackagingDetails(ing);
        const capStr = pkg.capacity > 1 ? ` (${pkg.capacity} ${ing.uniteMesure})` : '';
        const priceStr = pkg.priceHt > 0 ? ` · ${pkg.priceHt.toFixed(2)} €` : '';
        return {
          value: ing.id,
          label: ing.nom,
          subLabel: `${pkg.unit}${capStr}${priceStr}`
        };
      });
  }

  /**
   * Resolves the commercial packaging and pricing details for an ingredient.
   */
  resolvePackagingDetails(ing: Ingredient): { unit: string; capacity: number; priceHt: number } {
    let unit = ing.purchaseUnit;
    let capacity = ing.packagingCapacity;
    let priceHt = ing.packagingPriceHt;

    if (!unit || !capacity || capacity <= 1) {
      const u = (ing.uniteMesure || '').toLowerCase();
      if (u === 'cl' || u === 'ml') {
        unit = 'Bouteille 70cl';
        capacity = 70;
        priceHt = priceHt || Math.round((ing.prixUnitaire || ing.unitCost || 0.25) * 70 * 100) / 100;
      } else if (u === 'l') {
        unit = 'Bouteille 1L';
        capacity = 1;
        priceHt = priceHt || ing.prixUnitaire || ing.unitCost || 0;
      } else if (u === 'feuille' || u === 'feuilles') {
        unit = 'Botte (≈ 50 feuilles)';
        capacity = 50;
        priceHt = priceHt || Math.round((ing.prixUnitaire || ing.unitCost || 0.05) * 50 * 100) / 100;
      } else if (u === 'g') {
        unit = 'Paquet 1kg';
        capacity = 1000;
        priceHt = priceHt || Math.round((ing.prixUnitaire || ing.unitCost || 0.01) * 1000 * 100) / 100;
      } else if (u === 'kg') {
        unit = 'Paquet 1kg';
        capacity = 1;
        priceHt = priceHt || ing.prixUnitaire || ing.unitCost || 0;
      } else {
        unit = unit || ing.uniteMesure || 'Pièce';
        capacity = capacity || 1;
        priceHt = priceHt || ing.unitCost || ing.prixUnitaire || 0;
      }
    } else {
      priceHt = priceHt || ing.unitCost || ing.prixUnitaire || 0;
    }

    return {
      unit: unit || 'Unité',
      capacity: capacity || 1,
      priceHt: priceHt || 0
    };
  }

  /**
   * Returns standard packaging presets matching the selected ingredient's nature.
   */
  getPackagingPresets(ctrl: AbstractControl): PackagingPresetOption[] {
    const ingId = Number(ctrl.get('ingredientId')?.value);
    const ing = this.ingredients.find(i => i.id === ingId);
    if (!ing) {
      return [
        { label: 'Pièce / Unité (1)', unit: 'Pièce', capacity: 1 },
        { label: 'Carton (6x)', unit: 'Carton 6x', capacity: 6 },
        { label: 'Colis (12x)', unit: 'Colis 12x', capacity: 12 },
        { label: 'Format sur-mesure', unit: 'CUSTOM', capacity: 1 }
      ];
    }

    const u = (ing.uniteMesure || '').toLowerCase();
    let presets: PackagingPresetOption[] = [];

    if (u === 'cl') {
      presets = [
        { label: 'Bouteille 70cl (70 cl)', unit: 'Bouteille 70cl', capacity: 70 },
        { label: 'Bouteille 75cl (75 cl)', unit: 'Bouteille 75cl', capacity: 75 },
        { label: 'Bouteille 1L (100 cl)', unit: 'Bouteille 1L', capacity: 100 },
        { label: 'Magnum 1.75L (175 cl)', unit: 'Magnum 1.75L', capacity: 175 },
        { label: 'Carton 6x70cl (420 cl)', unit: 'Carton 6x70cl', capacity: 420 },
        { label: 'Carton 6x1L (600 cl)', unit: 'Carton 6x1L', capacity: 600 },
        { label: 'Fût 20L (2000 cl)', unit: 'Fût 20L', capacity: 2000 },
        { label: 'Fût 30L (3000 cl)', unit: 'Fût 30L', capacity: 3000 },
        { label: 'Litre Vrac (100 cl)', unit: 'Litre', capacity: 100 },
      ];
    } else if (u === 'ml') {
      presets = [
        { label: 'Bouteille 700ml (700 ml)', unit: 'Bouteille 700ml', capacity: 700 },
        { label: 'Bouteille 750ml (750 ml)', unit: 'Bouteille 750ml', capacity: 750 },
        { label: 'Bouteille 1L (1000 ml)', unit: 'Bouteille 1L', capacity: 1000 },
        { label: 'Magnum 1.75L (1750 ml)', unit: 'Magnum 1.75L', capacity: 1750 },
        { label: 'Carton 6x700ml (4200 ml)', unit: 'Carton 6x700ml', capacity: 4200 },
        { label: 'Fût 20L (20000 ml)', unit: 'Fût 20L', capacity: 20000 },
        { label: 'Fût 30L (30000 ml)', unit: 'Fût 30L', capacity: 30000 },
        { label: 'Litre Vrac (1000 ml)', unit: 'Litre', capacity: 1000 },
      ];
    } else if (u === 'l') {
      presets = [
        { label: 'Bouteille 1L (1 L)', unit: 'Bouteille 1L', capacity: 1 },
        { label: 'Bouteille 70cl (0.7 L)', unit: 'Bouteille 70cl', capacity: 0.7 },
        { label: 'Magnum 1.75L (1.75 L)', unit: 'Magnum 1.75L', capacity: 1.75 },
        { label: 'Carton 6x1L (6 L)', unit: 'Carton 6x1L', capacity: 6 },
        { label: 'Fût 20L (20 L)', unit: 'Fût 20L', capacity: 20 },
        { label: 'Fût 30L (30 L)', unit: 'Fût 30L', capacity: 30 },
        { label: 'Bidon 5L (5 L)', unit: 'Bidon 5L', capacity: 5 },
      ];
    } else if (u === 'g') {
      presets = [
        { label: 'Paquet 1kg (1000 g)', unit: 'Paquet 1kg', capacity: 1000 },
        { label: 'Boîte 500g (500 g)', unit: 'Boîte 500g', capacity: 500 },
        { label: 'Boîte 250g (250 g)', unit: 'Boîte 250g', capacity: 250 },
        { label: 'Sac 5kg (5000 g)', unit: 'Sac 5kg', capacity: 5000 },
        { label: 'Sac 10kg (10000 g)', unit: 'Sac 10kg', capacity: 10000 },
        { label: 'Vrac 100g (100 g)', unit: 'Vrac 100g', capacity: 100 },
      ];
    } else if (u === 'kg') {
      presets = [
        { label: 'Paquet 1kg (1 kg)', unit: 'Paquet 1kg', capacity: 1 },
        { label: 'Sac 5kg (5 kg)', unit: 'Sac 5kg', capacity: 5 },
        { label: 'Sac 10kg (10 kg)', unit: 'Sac 10kg', capacity: 10 },
        { label: 'Cagette 10kg (10 kg)', unit: 'Cagette 10kg', capacity: 10 },
        { label: 'Filet 1kg (1 kg)', unit: 'Filet 1kg', capacity: 1 },
      ];
    } else if (u === 'feuille' || u === 'feuilles') {
      presets = [
        { label: 'Botte (≈ 50 feuilles)', unit: 'Botte (≈ 50 feuilles)', capacity: 50 },
        { label: 'Botte (≈ 100 feuilles)', unit: 'Botte (≈ 100 feuilles)', capacity: 100 },
        { label: 'Feuille (1)', unit: 'Feuille', capacity: 1 },
      ];
    } else {
      presets = [
        { label: 'Pièce / Unité (1)', unit: 'Pièce', capacity: 1 },
        { label: 'Colis 10 unités', unit: 'Colis 10 unités', capacity: 10 },
        { label: 'Carton 24 unités', unit: 'Carton 24 unités', capacity: 24 },
      ];
    }

    if (ing.purchaseUnit && !presets.some(p => p.unit === ing.purchaseUnit)) {
      presets.unshift({
        label: `${ing.purchaseUnit} (${ing.packagingCapacity || 1} ${ing.uniteMesure})`,
        unit: ing.purchaseUnit,
        capacity: ing.packagingCapacity || 1
      });
    }

    presets.push({ label: 'Format sur-mesure', unit: 'CUSTOM', capacity: 1 });
    return presets;
  }

  /**
   * Builds SearchableOption list representing commercial packaging formats for a table row.
   */
  getPackagingOptions(ctrl: AbstractControl): SearchableOption[] {
    const presets = this.getPackagingPresets(ctrl);
    const ingId = Number(ctrl.get('ingredientId')?.value);
    const ing = this.ingredients.find(i => i.id === ingId);
    const recipeUnit = ing?.uniteMesure || '';
    const currentUnit = ctrl.get('purchaseUnit')?.value;
    const isCustom = this.isCustomPackaging(ctrl);

    const options: SearchableOption[] = presets
      .filter(p => p.unit !== 'CUSTOM' && p.unit !== 'Format sur-mesure')
      .map(p => {
        let badge: string | undefined;
        let icon = 'wine-outline';
        const uLower = p.unit.toLowerCase();
        if (
          uLower.includes('carton') ||
          uLower.includes('colis') ||
          uLower.includes('cagette') ||
          uLower.includes('boîte') ||
          uLower.includes('paquet') ||
          uLower.includes('sac') ||
          uLower.includes('filet')
        ) {
          icon = 'cube-outline';
        } else if (uLower.includes('fût') || uLower.includes('bidon')) {
          icon = 'beer-outline';
        } else if (uLower.includes('botte') || uLower.includes('feuille')) {
          icon = 'leaf-outline';
        }

        if (p.capacity > 0 && recipeUnit) {
          badge = `${p.capacity} ${recipeUnit}`;
        }

        return {
          value: p.unit,
          label: p.unit,
          badge,
          badgeType: 'primary',
          icon
        };
      });

    // Custom packaging option
    const customValue = isCustom && currentUnit && currentUnit !== 'CUSTOM' ? currentUnit : 'Format sur-mesure';
    const customLabel = isCustom && currentUnit && currentUnit !== 'CUSTOM' && currentUnit !== 'Format sur-mesure'
      ? `${this.transloco.translate('PURCHASES.CUSTOM_PACKAGING')} (${currentUnit})`
      : this.transloco.translate('PURCHASES.CUSTOM_PACKAGING');

    options.push({
      value: customValue,
      label: customLabel,
      badge: isCustom && ctrl.get('packagingCapacity')?.value > 0 ? `${ctrl.get('packagingCapacity')?.value} ${recipeUnit}` : undefined,
      badgeType: 'neutral',
      icon: 'create-outline'
    });

    return options;
  }

  /**
   * Determines whether an item line is currently using custom packaging format.
   */
  isCustomPackaging(ctrl: AbstractControl): boolean {
    const isCustom = ctrl.get('isCustom')?.value === true;
    const unit = ctrl.get('purchaseUnit')?.value;
    return isCustom || unit === 'Format sur-mesure' || unit === 'CUSTOM';
  }

  /**
   * Returns the recipe base unit of measure for the selected ingredient.
   */
  getIngredientUnit(ctrl: AbstractControl): string {
    const ingId = Number(ctrl.get('ingredientId')?.value);
    const ing = this.ingredients.find(i => i.id === ingId);
    return ing?.uniteMesure || '';
  }

  private static readonly UNIT_GROUPS: { match: string[]; units: string[] }[] = [
    { match: ['cl', 'ml', 'l'], units: ['cl', 'L', 'ml'] },
    { match: ['g', 'kg'], units: ['g', 'kg'] },
    { match: ['feuille', 'feuilles'], units: ['feuille'] },
    { match: ['pièce', 'piece', 'pieces', 'unité', 'unit'], units: ['pièce'] },
    { match: ['pincée', 'pincee', 'cuillère', 'cuillere'], units: ['pincée', 'g', 'kg'] },
    { match: ['trait', 'dash', 'goutte'], units: ['trait', 'flacon', 'bouteille', 'cl'] }
  ];

  /**
   * Returns compatible packaging units of measure for an ingredient line.
   */
  getAvailableUnits(ctrl: AbstractControl): string[] {
    const ingId = Number(ctrl.get('ingredientId')?.value);
    const ing = this.ingredients.find(i => i.id === ingId);
    const baseUnit = (ing?.uniteMesure || '').toLowerCase();
    const group = PurchaseOrderFormModalComponent.UNIT_GROUPS.find(g => g.match.includes(baseUnit));
    return group ? group.units : [ing?.uniteMesure || 'Unité'];
  }

  /**
   * Builds SearchableOption list for the custom unit dropdown.
   */
  getCustomUnitOptions(ctrl: AbstractControl): SearchableOption[] {
    const units = this.getAvailableUnits(ctrl);
    return units.map(u => ({
      value: u,
      label: u
    }));
  }

  private static readonly UNIT_CONVERSION_TABLE: Record<string, number> = {
    'l->cl': 100,
    'ml->cl': 0.1,
    'l->ml': 1000,
    'cl->ml': 10,
    'cl->l': 0.01,
    'ml->l': 0.001,
    'kg->g': 1000,
    'g->kg': 0.001
  };

  private static readonly PACK_PREFIX_REGEX = /^(?:pack|carton|colis|caisse)\s*(?:de)?\s*/i;
  private static readonly SINGLE_PREFIX_REGEX = /^(?:bouteille|paquet|format|sac|bo[îi]te)\s*(?:de)?\s*/i;
  private static readonly PACK_REGEX = /^(\d+)\s*[x*]\s*(\d+(?:[.,]\d+)?)\s*([a-z%€µ]+)?$/i;
  private static readonly SINGLE_REGEX = /^(\d+(?:[.,]\d+)?)\s*([a-z%€µ]+)?$/i;

  /**
   * Calculates conversion factor between commercial packaging unit and recipe base unit.
   */
  getConversionFactor(fromUnit: string, toUnit: string): number {
    const from = (fromUnit || '').trim().toLowerCase();
    const to = (toUnit || '').trim().toLowerCase();
    if (!from || !to || from === to) return 1;
    return PurchaseOrderFormModalComponent.UNIT_CONVERSION_TABLE[`${from}->${to}`] ?? 1;
  }

  /**
   * Computes effective capacity in recipe stock units for custom packaging.
   */
  calculateCustomCapacity(packCount: number, unitCapacity: number, unit: string, targetRecipeUnit: string): number {
    const factor = this.getConversionFactor(unit, targetRecipeUnit);
    const total = packCount * unitCapacity * factor;
    return Math.round(total * 1000) / 1000;
  }

  /**
   * Generates a descriptive format label for custom packs (e.g. Carton 6x70cl, Bouteille 70cl).
   */
  formatCustomPurchaseUnit(packCount: number, unitCapacity: number, unit: string): string {
    if (packCount > 1) {
      return `Carton ${packCount}x${unitCapacity}${unit}`;
    }
    const uLower = (unit || '').toLowerCase();
    if (uLower === 'cl' || uLower === 'ml' || uLower === 'l') {
      return `Bouteille ${unitCapacity}${unit}`;
    }
    if (uLower === 'kg' || uLower === 'g') {
      return `Paquet ${unitCapacity}${unit}`;
    }
    return `${unitCapacity} ${unit}`;
  }

  /**
   * Parses free-text packaging strings such as '6x70cl', '12x33cl', '1.5L', etc.
   */
  parseCustomText(text: string, defaultUnit: string): { pack: number; size: number; unit: string } | null {
    if (!text?.trim()) return null;
    const trimmed = text.trim();

    // Try pack match (e.g. "6x70cl", "Carton 6x70cl")
    const cleanedPack = trimmed.replace(PurchaseOrderFormModalComponent.PACK_PREFIX_REGEX, '');
    const matchPack = PurchaseOrderFormModalComponent.PACK_REGEX.exec(cleanedPack);
    if (matchPack) {
      const pack = Number.parseInt(matchPack[1], 10);
      const size = Number.parseFloat(matchPack[2].replace(',', '.'));
      const unit = matchPack[3] || defaultUnit;
      if (!Number.isNaN(pack) && !Number.isNaN(size) && pack > 0 && size > 0) {
        return { pack, size, unit };
      }
    }

    // Try single format match (e.g. "70cl", "Bouteille 70cl", "1.5L")
    const cleanedSingle = trimmed.replace(PurchaseOrderFormModalComponent.SINGLE_PREFIX_REGEX, '');
    const matchSingle = PurchaseOrderFormModalComponent.SINGLE_REGEX.exec(cleanedSingle);
    if (matchSingle) {
      const size = Number.parseFloat(matchSingle[1].replace(',', '.'));
      const unit = matchSingle[2] || defaultUnit;
      if (!Number.isNaN(size) && size > 0) {
        return { pack: 1, size, unit };
      }
    }

    return null;
  }

  /**
   * Applies custom packaging pack and capacity configuration to an order line item.
   */
  applyCustomPackaging(index: number, pack: number, size: number, unit: string, rawText?: string): void {
    const line = this.items.at(index);
    if (!line) return;

    const safePack = Math.max(1, Math.floor(pack || 1));
    const safeSize = Math.max(0.01, size || 1);
    const safeUnit = unit || this.getIngredientUnit(line);
    const recipeUnit = this.getIngredientUnit(line);

    const capacity = this.calculateCustomCapacity(safePack, safeSize, safeUnit, recipeUnit);
    const purchaseUnitName = this.formatCustomPurchaseUnit(safePack, safeSize, safeUnit);

    const ingId = Number(line.get('ingredientId')?.value);
    const ing = this.ingredients.find(i => i.id === ingId);
    const baseCost = ing?.prixUnitaire || ing?.unitCost || 0;
    const newPriceHt = Math.round(baseCost * capacity * 100) / 100;

    const defaultRawText = safePack > 1
      ? `${safePack}x${safeSize}${safeUnit}`
      : `${safeSize}${safeUnit}`;
    const customRawText = rawText ?? defaultRawText;

    line.patchValue({
      isCustom: true,
      purchaseUnit: purchaseUnitName,
      packagingCapacity: capacity,
      customPackCount: safePack,
      customUnitCapacity: safeSize,
      customUnit: safeUnit,
      customRawText,
      ...(newPriceHt > 0 ? { prixUnitaireHt: newPriceHt } : {})
    });
  }

  /**
   * Quick-entry input handler for custom packaging strings.
   */
  onQuickCustomInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value;
    const line = this.items.at(index);
    if (!line) return;
    const defaultUnit = this.getCustomUnit(line) || this.getIngredientUnit(line) || 'cl';
    const parsed = this.parseCustomText(text, defaultUnit);
    if (parsed) {
      this.applyCustomPackaging(index, parsed.pack, parsed.size, parsed.unit, text);
    } else {
      line.patchValue({ customRawText: text });
    }
  }

  /**
   * Custom pack count change listener.
   */
  onCustomPackChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const pack = Number.parseInt(input.value, 10) || 1;
    const line = this.items.at(index);
    if (!line) return;
    const size = this.getCustomUnitCapacity(line);
    const unit = this.getCustomUnit(line);
    this.applyCustomPackaging(index, pack, size, unit);
  }

  /**
   * Custom unit capacity change listener.
   */
  onCustomSizeChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const size = Number.parseFloat(input.value.replace(',', '.')) || 1;
    const line = this.items.at(index);
    if (!line) return;
    const pack = this.getCustomPackCount(line);
    const unit = this.getCustomUnit(line);
    this.applyCustomPackaging(index, pack, size, unit);
  }

  /**
   * Custom unit dropdown change listener.
   */
  onCustomUnitChange(index: number, optionOrEvent: SearchableOption | Event | string | null): void {
    if (!optionOrEvent) return;
    const unit = this.extractSelectedPackagingValue(optionOrEvent);
    const line = this.items.at(index);
    if (!line) return;
    const pack = this.getCustomPackCount(line);
    const size = this.getCustomUnitCapacity(line);
    this.applyCustomPackaging(index, pack, size, unit);
  }

  getCustomPackCount(ctrl: AbstractControl): number {
    return Number(ctrl.get('customPackCount')?.value) || 1;
  }

  getCustomUnitCapacity(ctrl: AbstractControl): number {
    return Number(ctrl.get('customUnitCapacity')?.value) || 1;
  }

  getCustomUnit(ctrl: AbstractControl): string {
    return ctrl.get('customUnit')?.value || this.getAvailableUnits(ctrl)[0] || '';
  }

  getCustomRawText(ctrl: AbstractControl): string {
    return ctrl.get('customRawText')?.value || '';
  }

  private extractSelectedPackagingValue(eventOrOption: Event | SearchableOption | string): string {
    if (typeof eventOrOption === 'string') {
      return eventOrOption;
    }
    if (typeof eventOrOption === 'object' && 'value' in eventOrOption) {
      return String((eventOrOption as SearchableOption).value);
    }
    const select = (eventOrOption as Event).target as HTMLSelectElement;
    return select?.value || '';
  }

  private handleCustomPackagingSelected(
    _index: number,
    line: AbstractControl,
    ing: Ingredient | undefined,
    recipeUnit: string
  ): void {
    const defaultPack = 1;
    const defaultSize = (ing?.packagingCapacity && ing.packagingCapacity > 1) ? ing.packagingCapacity : 1;
    const defaultUnit = this.getAvailableUnits(line)[0] || recipeUnit;

    line.patchValue({
      isCustom: true,
      purchaseUnit: 'Format sur-mesure',
      packagingCapacity: defaultSize,
      customPackCount: defaultPack,
      customUnitCapacity: defaultSize,
      customUnit: defaultUnit
    });
  }

  private handlePresetPackagingSelected(
    line: AbstractControl,
    ing: Ingredient | undefined,
    selectedVal: string
  ): void {
    const presets = this.getPackagingPresets(line);
    const preset = presets.find(p => p.unit === selectedVal);
    if (!preset) return;

    const baseCost = ing?.prixUnitaire || ing?.unitCost || 0;
    const newPriceHt = Math.round(baseCost * preset.capacity * 100) / 100;

    line.patchValue({
      isCustom: false,
      purchaseUnit: preset.unit,
      packagingCapacity: preset.capacity,
      ...(newPriceHt > 0 ? { prixUnitaireHt: newPriceHt } : {})
    });
  }

  /**
   * Updates packaging unit, capacity and recalculates suggested unit price on packaging selection.
   */
  onPackagingSelected(index: number, eventOrOption: Event | SearchableOption | string | null): void {
    if (!eventOrOption) return;

    const selectedVal = this.extractSelectedPackagingValue(eventOrOption);
    const line = this.items.at(index);
    if (!line) return;

    const ingId = Number(line.get('ingredientId')?.value);
    const ing = this.ingredients.find(i => i.id === ingId);
    const recipeUnit = ing?.uniteMesure || 'cl';

    if (selectedVal === 'CUSTOM' || selectedVal === 'Format sur-mesure') {
      this.handleCustomPackagingSelected(index, line, ing, recipeUnit);
      return;
    }

    this.handlePresetPackagingSelected(line, ing, selectedVal);
  }

  /**
   * Appends an item line to the order form.
   */
  addItem(
    ingredientId?: number,
    unitCost = 0,
    defaultVat = 20,
    qty = 1,
    purchaseUnit = '',
    packagingCapacity = 1
  ): void {
    const isCustom = purchaseUnit === 'Format sur-mesure' || purchaseUnit === 'CUSTOM';
    const itemGroup = this.fb.group({
      ingredientId: [ingredientId ?? null, [Validators.required]],
      quantiteCommandee: [qty, [Validators.required, Validators.min(0.001)]],
      prixUnitaireHt: [unitCost, [Validators.required, Validators.min(0)]],
      tauxTva: [defaultVat, [Validators.required, Validators.min(0)]],
      purchaseUnit: [purchaseUnit],
      packagingCapacity: [packagingCapacity, [Validators.min(0.001)]],
      isCustom: [isCustom],
      customPackCount: [1],
      customUnitCapacity: [packagingCapacity || 1],
      customUnit: [''],
      customRawText: ['']
    });

    this.items.push(itemGroup);
  }

  /**
   * Removes an item line from the order form.
   */
  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  /**
   * Handles ingredient change to automatically preload unit cost and smart commercial packaging details.
   */
  onIngredientSelected(index: number, optionOrId: SearchableOption | number | string | null): void {
    const ingId = typeof optionOrId === 'object' && optionOrId !== null
      ? Number(optionOrId.value)
      : Number(optionOrId);

    if (!ingId) {
      return;
    }

    const selectedIng = this.ingredients.find(i => i.id === ingId);
    if (selectedIng) {
      const line = this.items.at(index);
      const pkg = this.resolvePackagingDetails(selectedIng);

      line.patchValue({
        ingredientId: ingId,
        prixUnitaireHt: pkg.priceHt,
        purchaseUnit: pkg.unit,
        packagingCapacity: pkg.capacity
      });
    }
  }

  /**
   * Computes the calculated equivalent inventory stock quantity for an order line item.
   */
  getEquivalentStock(ctrl: AbstractControl): { qty: number; unit: string } {
    const ingId = Number(ctrl.get('ingredientId')?.value);
    const qty = Number(ctrl.get('quantiteCommandee')?.value) || 0;
    const capacity = Number(ctrl.get('packagingCapacity')?.value) || 1;
    const ing = this.ingredients.find(i => i.id === ingId);
    const unit = ing?.uniteMesure || '';
    return {
      qty: Math.round(qty * capacity * 100) / 100,
      unit
    };
  }

  /**
   * Opens the barcode scanner modal to quickly identify and add an ingredient.
   */
  async openBarcodeScanner(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BarcodeScannerModalComponent,
      componentProps: {
        title: 'PURCHASES.SCAN_BARCODE_TITLE',
        subtitle: 'PURCHASES.SCAN_BARCODE_SUBTITLE'
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss<BarcodeScannerResult>();

    if (data && !data.cancelled && data.barcode) {
      this.handleBarcodeScanned(data.barcode);
    }
  }

  /**
   * Finds ingredient by barcode and adds to order or increments quantity.
   */
  private handleBarcodeScanned(code: string): void {
    this.ingredientService.getByBarcode(code).subscribe({
      next: (ingredient) => {
        // Check if ingredient is already in items
        const existingIndex = this.items.controls.findIndex(
          ctrl => Number(ctrl.get('ingredientId')?.value) === ingredient.id
        );

        if (existingIndex >= 0) {
          const ctrl = this.items.at(existingIndex);
          const currentQty = Number(ctrl.get('quantiteCommandee')?.value || 0);
          ctrl.patchValue({ quantiteCommandee: currentQty + 1 });
          this.showToast(
            this.transloco.translate('PURCHASES.BARCODE_QTY_INCREMENTED', { name: ingredient.nom }),
            'success'
          );
        } else {
          // If first row is empty, replace it
          if (this.items.length === 1 && !this.items.at(0).get('ingredientId')?.value) {
            this.items.at(0).patchValue({
              ingredientId: ingredient.id,
              quantiteCommandee: 1,
              prixUnitaireHt: ingredient.unitCost || ingredient.prixUnitaire || 0
            });
          } else {
            this.addItem(
              ingredient.id,
              ingredient.unitCost || ingredient.prixUnitaire || 0,
              20
            );
          }
          this.showToast(
            this.transloco.translate('PURCHASES.BARCODE_ITEM_ADDED', { name: ingredient.nom }),
            'success'
          );
        }
      },
      error: () => {
        this.showToast(
          this.transloco.translate('PURCHASES.BARCODE_NOT_FOUND', { code }),
          'warning'
        );
      }
    });
  }

  /**
   * Calculates total HT of the entire order.
   */
  get totalHt(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const qty = Number(ctrl.get('quantiteCommandee')?.value) || 0;
      const pu = Number(ctrl.get('prixUnitaireHt')?.value) || 0;
      return sum + (qty * pu);
    }, 0);
  }

  /**
   * Calculates total TVA of the order.
   */
  get totalTva(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const qty = Number(ctrl.get('quantiteCommandee')?.value) || 0;
      const pu = Number(ctrl.get('prixUnitaireHt')?.value) || 0;
      const tva = Number(ctrl.get('tauxTva')?.value) || 0;
      return sum + (qty * pu * (tva / 100));
    }, 0);
  }

  get totalTtc(): number {
    return this.totalHt + this.totalTva;
  }

  onSubmit(): void {
    if (this.form.invalid || this.items.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const requestItems: PurchaseOrderItemRequest[] = val.items.map((it: any) => ({
      ingredientId: Number(it.ingredientId),
      quantiteCommandee: Number(it.quantiteCommandee),
      prixUnitaireHt: Number(it.prixUnitaireHt),
      tauxTva: Number(it.tauxTva),
      purchaseUnit: it.purchaseUnit || undefined,
      packagingCapacity: it.packagingCapacity ? Number(it.packagingCapacity) : undefined
    }));

    const payload: PurchaseOrderCreateRequest = {
      supplierId: Number(val.supplierId),
      dateLivraisonPrevue: val.dateLivraisonPrevue ? new Date(val.dateLivraisonPrevue).toISOString() : undefined,
      referenceFactureFournisseur: val.referenceFactureFournisseur || undefined,
      notes: val.notes || undefined,
      items: requestItems
    };

    void this.modalCtrl.dismiss({ order: payload, confirmed: true, orderId: this.order?.id });
  }

  onCancel(): void {
    void this.modalCtrl.dismiss({ confirmed: false });
  }

  private showToast(message: string, color: 'success' | 'warning' | 'danger'): void {
    void this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    }).then(t => void t.present());
  }
}
