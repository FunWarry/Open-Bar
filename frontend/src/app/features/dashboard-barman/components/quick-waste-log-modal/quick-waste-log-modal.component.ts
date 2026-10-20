import { Component, OnInit, inject, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton,
  IonContent, IonFooter, IonIcon, IonSpinner, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  wineOutline,
  warningOutline,
  alertCircleOutline,
  peopleOutline,
  giftOutline,
  flashOutline,
  checkmarkCircleOutline,
  refreshOutline,
  beerOutline,
  waterOutline,
  cubeOutline,
  sparklesOutline,
  trashOutline,
  flaskOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SearchBarComponent } from '../../../../core/components/ui/search-bar/search-bar.component';
import { SearchableSelectComponent, SearchableOption } from '../../../../core/components/ui/searchable-select/searchable-select.component';
import { QuantityStepperComponent } from '../../../../core/components/ui/quantity-stepper/quantity-stepper.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { Ingredient } from '../../../../core/models/ingredient.model';
import { IngredientService } from '../../../../core/services/ingredient.service';
import { StockWasteService } from '../../../../core/services/stock-waste.service';
import { StockMovement, StockWasteReason } from '../../../../core/models/stock-waste.model';

/**
 * Filter category type for quick-filtering speed rail ingredients.
 */
export type SpeedRailCategory = 'ALL' | 'SPIRITS' | 'WINE_BEER' | 'SOFTS' | 'OTHER';

/**
 * Predefined quick dose preset descriptor.
 */
export interface DosePreset {
  id: string;
  labelKey: string;
  volumeCl: number;
}

/**
 * Reason descriptor with visual styling and icon.
 */
export interface QuickReasonOption {
  value: StockWasteReason;
  labelKey: string;
  icon: string;
  badgeColor: string;
}

/**
 * High-speed 2-tap bartender waste, shrinkage, and tasting quick-logging modal.
 * Tailored for fast counter operations, wet hands, and instant stock decrements with undo feedback.
 */
@Component({
  selector: 'app-quick-waste-log-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonIcon,
    IonSpinner,
    SearchBarComponent,
    SearchableSelectComponent,
    QuantityStepperComponent,
    ActionButtonComponent
  ],
  templateUrl: './quick-waste-log-modal.component.html',
  styleUrls: ['./quick-waste-log-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class QuickWasteLogModalComponent implements OnInit {
  @Input() preselectedIngredient?: Ingredient;

  private readonly ingredientService = inject(IngredientService);
  private readonly stockWasteService = inject(StockWasteService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  availableIngredients: Ingredient[] = [];
  filteredIngredients: Ingredient[] = [];

  selectedCategory: SpeedRailCategory = 'SPIRITS';
  searchTerm = '';

  selectedIngredient: Ingredient | null = null;
  selectedReason: StockWasteReason = 'ERREUR_PREPARATION';

  quantity = 4;
  customNotes = '';

  isLoading = false;
  isSubmitting = false;
  showCustomStepper = false;

  readonly reasonOptions: readonly QuickReasonOption[] = [
    { value: 'ERREUR_PREPARATION', labelKey: 'BARMAN_DASHBOARD.QUICK_WASTE_REASON_SPILL', icon: 'warning-outline', badgeColor: 'warning' },
    { value: 'CASSE', labelKey: 'BARMAN_DASHBOARD.QUICK_WASTE_REASON_BREAKAGE', icon: 'wine-outline', badgeColor: 'danger' },
    { value: 'DEGUSTATION_STAFF', labelKey: 'BARMAN_DASHBOARD.QUICK_WASTE_REASON_TASTING', icon: 'people-outline', badgeColor: 'primary' },
    { value: 'OFFERT_PATRON', labelKey: 'BARMAN_DASHBOARD.QUICK_WASTE_REASON_COMP', icon: 'gift-outline', badgeColor: 'tertiary' }
  ];

  readonly dosePresets: readonly DosePreset[] = [
    { id: 'shot', labelKey: 'BARMAN_DASHBOARD.DOSE_SHOT', volumeCl: 2 },
    { id: 'standard', labelKey: 'BARMAN_DASHBOARD.DOSE_STANDARD', volumeCl: 4 },
    { id: 'double', labelKey: 'BARMAN_DASHBOARD.DOSE_DOUBLE', volumeCl: 6 },
    { id: 'half_bottle', labelKey: 'BARMAN_DASHBOARD.DOSE_HALF_BOTTLE', volumeCl: 35 },
    { id: 'full_bottle', labelKey: 'BARMAN_DASHBOARD.DOSE_FULL_BOTTLE', volumeCl: 70 }
  ];

  constructor() {
    addIcons({
      closeOutline,
      wineOutline,
      warningOutline,
      alertCircleOutline,
      peopleOutline,
      giftOutline,
      flashOutline,
      checkmarkCircleOutline,
      refreshOutline,
      beerOutline,
      waterOutline,
      cubeOutline,
      sparklesOutline,
      trashOutline,
      flaskOutline
    });
  }

  ngOnInit(): void {
    if (this.preselectedIngredient) {
      this.selectedIngredient = this.preselectedIngredient;
      this.quantity = this.computeDefaultDose(this.preselectedIngredient);
    }
    this.loadIngredients();
  }

  /**
   * Fetches the complete ingredient catalog and filters for speed rail items.
   */
  loadIngredients(): void {
    this.isLoading = true;
    this.ingredientService.getAll().subscribe({
      next: (ingredients) => {
        this.availableIngredients = ingredients;
        this.isLoading = false;
        this.applyFilter();

        if (this.selectedIngredient) {
          const fresh = ingredients.find(i => i.id === this.selectedIngredient?.id);
          if (fresh) {
            this.selectedIngredient = fresh;
          }
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Dropdown options for speed rail categories.
   */
  get categoryOptions(): SearchableOption<SpeedRailCategory>[] {
    return [
      { value: 'SPIRITS', label: this.transloco.translate('BARMAN_DASHBOARD.CAT_SPIRITS'), icon: 'wine-outline' },
      { value: 'WINE_BEER', label: this.transloco.translate('BARMAN_DASHBOARD.CAT_WINE_BEER'), icon: 'beer-outline' },
      { value: 'SOFTS', label: this.transloco.translate('BARMAN_DASHBOARD.CAT_SOFTS'), icon: 'water-outline' },
      { value: 'ALL', label: this.transloco.translate('COMMON.ALL'), icon: 'cube-outline' }
    ];
  }

  /**
   * Handles category filter selection change from the dropdown.
   *
   * @param option The selected category option
   */
  onCategoryChange(option: SearchableOption<SpeedRailCategory> | null): void {
    if (option && option.value) {
      this.setCategory(option.value);
    }
  }

  /**
   * Sets the category filter and updates the visible ingredient list.
   *
   * @param category Selected category
   */
  setCategory(category: SpeedRailCategory): void {
    this.selectedCategory = category;
    this.applyFilter();
  }

  /**
   * Handles search query changes from the search bar component.
   *
   * @param query Search query text
   */
  onSearchChange(query: string): void {
    this.searchTerm = query.trim().toLowerCase();
    this.applyFilter();
  }

  /**
   * Selects an ingredient from the Speed Rail grid.
   *
   * @param ingredient Selected ingredient
   */
  selectIngredient(ingredient: Ingredient): void {
    this.selectedIngredient = ingredient;
    this.quantity = this.computeDefaultDose(ingredient);
  }

  /**
   * Clears currently selected bottle or dismisses modal if opened with preselected ingredient.
   */
  clearSelectedIngredient(): void {
    if (this.preselectedIngredient) {
      this.dismiss();
    } else {
      this.selectedIngredient = null;
      this.showCustomStepper = false;
    }
  }


  /**
   * Selects the declared reason for shrinkage or loss.
   *
   * @param reason Selected waste reason
   */
  selectReason(reason: StockWasteReason): void {
    this.selectedReason = reason;
  }

  /**
   * Computes a suitable default dose based on the ingredient's unit of measure.
   *
   * @param ingredient Target ingredient
   * @returns Default quantity value
   */
  computeDefaultDose(ingredient: Ingredient): number {
    const unit = (ingredient.uniteMesure || '').toLowerCase().trim();
    if (unit === 'bouteille' || unit === 'bottle' || unit === 'u' || unit === 'pièce') {
      return 1;
    }
    if (unit === 'ml') {
      return 40;
    }
    if (unit === 'l') {
      return 0.04;
    }
    return 4; // standard 4 cl
  }

  /**
   * Converts a preset 4cl/35cl/70cl volume to the ingredient's native unit.
   *
   * @param preset Selected dose preset
   * @returns Converted quantity in native unit
   */
  getPresetConvertedQuantity(preset: DosePreset): number {
    if (!this.selectedIngredient) return preset.volumeCl;
    const unit = (this.selectedIngredient.uniteMesure || '').toLowerCase().trim();

    if (unit === 'ml') {
      return preset.volumeCl * 10;
    }
    if (unit === 'l') {
      return Math.round((preset.volumeCl / 100) * 1000) / 1000;
    }
    if (unit === 'bouteille' || unit === 'bottle' || unit === 'u' || unit === 'pièce') {
      if (preset.id === 'half_bottle') return 0.5;
      if (preset.id === 'full_bottle') return 1.0;
      return Math.round((preset.volumeCl / 70) * 100) / 100;
    }
    return preset.volumeCl;
  }

  /**
   * Returns human-readable label for preset quantity button.
   *
   * @param preset Target dose preset
   * @returns Display label with converted unit
   */
  getPresetDisplayLabel(preset: DosePreset): string {
    if (!this.selectedIngredient) {
      return `${preset.volumeCl} cl`;
    }
    const unit = (this.selectedIngredient.uniteMesure || '').trim();
    const qty = this.getPresetConvertedQuantity(preset);
    return `${qty} ${unit}`;
  }

  /**
   * 2-Tap Action: Selects preset dose and immediately triggers quick-log submission.
   *
   * @param preset Clicked dose preset
   */
  selectPresetAndSubmit(preset: DosePreset): void {
    this.quantity = this.getPresetConvertedQuantity(preset);
    this.submitQuickLog();
  }

  /**
   * Manually sets dose quantity from preset without immediate submission.
   *
   * @param preset Clicked dose preset
   */
  setPresetQuantity(preset: DosePreset): void {
    this.quantity = this.getPresetConvertedQuantity(preset);
  }

  /**
   * Toggles custom stepper adjustment display.
   */
  toggleCustomStepper(): void {
    this.showCustomStepper = !this.showCustomStepper;
  }

  /**
   * Updates quantity from the interactive stepper.
   *
   * @param newQty Updated quantity
   */
  onQuantityChange(newQty: number): void {
    this.quantity = Math.max(0.01, newQty);
  }

  /**
   * Applies category and text search filters across ingredients.
   */
  private applyFilter(): void {
    let result = this.availableIngredients;

    if (this.selectedCategory === 'SPIRITS') {
      result = result.filter(i =>
        i.category !== 'wine_beer' &&
        !(i.nom && /vin|bi[eè]re|cidre|champagne|prosecco/i.test(i.nom)) &&
        ((i.degreAlcool != null && i.degreAlcool > 0) ||
        ['dark_liquor', 'light_liquor', 'liqueurs'].includes(i.category || ''))
      );
    } else if (this.selectedCategory === 'WINE_BEER') {
      result = result.filter(i =>
        i.category === 'wine_beer' ||
        (i.nom && /vin|bi[eè]re|cidre|champagne|prosecco/i.test(i.nom))
      );
    } else if (this.selectedCategory === 'SOFTS') {
      result = result.filter(i =>
        ['juices', 'mixers', 'fruits'].includes(i.category || '') ||
        (i.degreAlcool === 0 && (i.uniteMesure === 'cl' || i.uniteMesure === 'ml' || i.uniteMesure === 'L'))
      );
    } else if (this.selectedCategory === 'OTHER') {
      result = result.filter(i =>
        !['dark_liquor', 'light_liquor', 'liqueurs', 'wine_beer', 'juices', 'mixers'].includes(i.category || '')
      );
    }

    if (this.searchTerm) {
      result = result.filter(i =>
        i.nom.toLowerCase().includes(this.searchTerm) ||
        (i.category?.toLowerCase().includes(this.searchTerm) ?? false)
      );
    }

    this.filteredIngredients = result;
  }

  /**
   * Checks whether the current selection is valid for submission.
   */
  get isValid(): boolean {
    return (
      this.selectedIngredient != null &&
      this.quantity > 0 &&
      !this.isSubmitting
    );
  }

  /**
   * Executes the atomic stock decrement via POST /api/stock/quick-log and dismisses the modal.
   */
  submitQuickLog(): void {
    if (!this.isValid || !this.selectedIngredient) return;

    this.isSubmitting = true;
    const ingredient = this.selectedIngredient;

    this.stockWasteService.quickLog({
      ingredientId: ingredient.id,
      quantity: this.quantity,
      reason: this.selectedReason,
      notes: this.customNotes.trim() || undefined
    }).subscribe({
      next: async (movement: StockMovement) => {
        this.isSubmitting = false;
        await this.modalCtrl.dismiss({ saved: true, movement }, 'saved');
      },
      error: async (err) => {
        this.isSubmitting = false;
        const errMsg = err?.error?.message || this.transloco.translate('BARMAN_DASHBOARD.QUICK_WASTE_ERROR');
        const toast = await this.toastCtrl.create({
          message: errMsg,
          duration: 3500,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  /**
   * Dismisses the modal without recording any waste.
   */
  dismiss(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }
}
