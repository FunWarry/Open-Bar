import { Component, OnInit, inject, Input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonInput, IonTextarea, IonIcon, IonSpinner,
  ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  warningOutline,
  alertCircleOutline,
  wineOutline,
  trashOutline,
  pricetagOutline,
  checkmarkCircleOutline,
  chatboxEllipsesOutline,
  timeOutline,
  giftOutline,
  peopleOutline,
  calculatorOutline,
  scaleOutline,
  cashOutline,
  sparklesOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { Ingredient } from '../../../core/models/ingredient.model';
import { IngredientService } from '../../../core/services/ingredient.service';
import { StockWasteService } from '../../../core/services/stock-waste.service';
import { StockWasteReason } from '../../../core/models/stock-waste.model';

/**
 * Metadata definition for stock waste reasons with visual icons and theme badges.
 */
export interface WasteReasonOption {
  value: StockWasteReason;
  labelKey: string;
  icon: string;
  badgeColor: string;
}

/**
 * Modal component allowing barmen and managers to declare stock shrinkage, breakage,
 * expiration, complimentary rounds, staff tastings, and preparation spills.
 * Immediately deducts inventory balance and triggers low-stock alerts.
 */
@Component({
  selector: 'app-stock-waste-modal',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoModule,
    AppCurrencyPipe,
    SearchableSelectComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonInput,
    IonTextarea,
    IonIcon,
    IonSpinner
],
  templateUrl: './stock-waste-modal.component.html',
  styleUrls: ['./stock-waste-modal.component.scss']
})
export class StockWasteModalComponent implements OnInit {
  @Input() ingredient?: Ingredient | null = null;
  @Input() preselectedIngredientId?: number | null = null;

  availableIngredients: Ingredient[] = [];
  selectedIngredient: Ingredient | null = null;
  selectedIngredientId: number | null = null;

  quantity: number | null = null;
  reason: StockWasteReason = 'CASSE';
  notes = '';

  isLoadingIngredients = false;
  isSubmitting = false;

  readonly reasons: { value: StockWasteReason; labelKey: string }[] = [
    { value: 'CASSE', labelKey: 'STOCK.WASTE_REASON_CASSE' },
    { value: 'PEREMPTION', labelKey: 'STOCK.WASTE_REASON_PEREMPTION' },
    { value: 'OFFERT_PATRON', labelKey: 'STOCK.WASTE_REASON_OFFERT_PATRON' },
    { value: 'DEGUSTATION_STAFF', labelKey: 'STOCK.WASTE_REASON_DEGUSTATION_STAFF' },
    { value: 'ERREUR_PREPARATION', labelKey: 'STOCK.WASTE_REASON_ERREUR_PREPARATION' },
  ];

  /** Visual reason options with dedicated icons and color accents. */
  readonly reasonOptions: WasteReasonOption[] = [
    { value: 'CASSE', labelKey: 'STOCK.WASTE_REASON_CASSE', icon: 'wine-outline', badgeColor: 'danger' },
    { value: 'PEREMPTION', labelKey: 'STOCK.WASTE_REASON_PEREMPTION', icon: 'time-outline', badgeColor: 'warning' },
    { value: 'OFFERT_PATRON', labelKey: 'STOCK.WASTE_REASON_OFFERT_PATRON', icon: 'gift-outline', badgeColor: 'tertiary' },
    { value: 'DEGUSTATION_STAFF', labelKey: 'STOCK.WASTE_REASON_DEGUSTATION_STAFF', icon: 'people-outline', badgeColor: 'primary' },
    { value: 'ERREUR_PREPARATION', labelKey: 'STOCK.WASTE_REASON_ERREUR_PREPARATION', icon: 'warning-outline', badgeColor: 'medium' }
  ];

  private readonly ingredientService = inject(IngredientService);
  private readonly stockWasteService = inject(StockWasteService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      closeOutline,
      warningOutline,
      alertCircleOutline,
      wineOutline,
      trashOutline,
      pricetagOutline,
      checkmarkCircleOutline,
      chatboxEllipsesOutline,
      timeOutline,
      giftOutline,
      peopleOutline,
      calculatorOutline,
      scaleOutline,
      cashOutline,
      sparklesOutline
    });
  }

  ngOnInit(): void {
    if (this.ingredient) {
      this.selectedIngredient = this.ingredient;
      this.selectedIngredientId = this.ingredient.id;
    } else {
      this.loadIngredients();
    }
  }

  /**
   * Searchable options list for ingredient selection.
   */
  get ingredientOptions(): SearchableOption<number>[] {
    return this.availableIngredients.map(ing => ({
      value: ing.id,
      label: ing.nom,
      subLabel: `${this.transloco.translate('STOCK.WASTE_CURRENT_STOCK', { stock: ing.quantiteStock, unit: ing.uniteMesure })}`,
      badge: `${ing.quantiteStock} ${ing.uniteMesure}`,
      badgeType: ing.quantiteStock <= (ing.seuilAlerte ?? 0) ? 'danger' : 'neutral',
      icon: 'wine-outline'
    }));
  }

  /**
   * Sets reason of the shrinkage.
   */
  selectReason(r: StockWasteReason): void {
    this.reason = r;
  }

  /**
   * Fills quantity based on a percentage of current stock (e.g. 25%, 50%, 100%).
   */
  setQuantityPercentage(percentage: number): void {
    if (!this.selectedIngredient || this.currentStock <= 0) return;
    const raw = (this.currentStock * percentage) / 100;
    this.quantity = Math.round(raw * 100) / 100;
  }

  /**
   * Computes expected remaining stock inventory after declared waste.
   */
  get remainingStock(): number {
    if (!this.selectedIngredient) return 0;
    const qty = this.quantity ?? 0;
    return Math.max(0, Math.round((this.currentStock - qty) * 100) / 100);
  }

  /**
   * Loads the list of all available ingredients when not passed as an input prop.
   */
  loadIngredients(): void {
    this.isLoadingIngredients = true;
    this.ingredientService.getAll().subscribe({
      next: (ingredients) => {
        this.availableIngredients = ingredients;
        this.isLoadingIngredients = false;

        if (this.preselectedIngredientId) {
          const matched = ingredients.find(i => i.id === this.preselectedIngredientId);
          if (matched) {
            this.selectedIngredient = matched;
            this.selectedIngredientId = matched.id;
          }
        }
      },
      error: () => {
        this.isLoadingIngredients = false;
      }
    });
  }

  /**
   * Handles user selection of an ingredient from the dropdown or searchable select.
   *
   * @param event The select change event or direct ingredient id
   */
  onIngredientChange(event: any): void {
    const id = (event && typeof event === 'object' && 'detail' in event) ? event.detail?.value : event;
    this.selectedIngredientId = id ? Number(id) : null;
    this.selectedIngredient = this.availableIngredients.find(i => i.id === this.selectedIngredientId) ?? null;
  }

  /**
   * Returns current stock quantity of the selected ingredient.
   */
  get currentStock(): number {
    return this.selectedIngredient?.quantiteStock ?? 0;
  }

  /**
   * Returns measurement unit of the selected ingredient.
   */
  get currentUnit(): string {
    return this.selectedIngredient?.uniteMesure ?? '';
  }

  /**
   * Returns unit purchase cost of the selected ingredient.
   */
  get unitCost(): number {
    return this.selectedIngredient?.prixUnitaire ?? 0;
  }

  /**
   * Calculates the estimated financial loss for the declared quantity.
   */
  get estimatedCost(): number {
    if (!this.quantity || this.quantity <= 0) {
      return 0;
    }
    return Math.round(this.quantity * this.unitCost * 100) / 100;
  }

  /**
   * Checks if the entered quantity exceeds available active inventory stock.
   */
  get isQuantityExceedingStock(): boolean {
    if (!this.selectedIngredient || this.quantity == null || this.quantity <= 0) {
      return false;
    }
    return this.quantity > this.currentStock;
  }

  /**
   * Checks whether the form submission is valid.
   */
  get isValid(): boolean {
    return (
      this.selectedIngredient != null &&
      this.quantity != null &&
      this.quantity > 0 &&
      !this.isQuantityExceedingStock &&
      !this.isSubmitting
    );
  }

  /**
   * Submits the waste declaration to the backend service.
   */
  submit(): void {
    if (!this.isValid || !this.selectedIngredient || this.quantity == null) {
      return;
    }

    this.isSubmitting = true;
    this.stockWasteService.recordWaste({
      ingredientId: this.selectedIngredient.id,
      quantity: this.quantity,
      reason: this.reason,
      notes: this.notes.trim() || undefined
    }).subscribe({
      next: async (movement) => {
        this.isSubmitting = false;
        const msg = this.transloco.translate('STOCK.WASTE_SUCCESS', {
          qty: movement.quantity,
          unit: movement.unit,
          name: movement.ingredientNom
        });
        const toast = await this.toastCtrl.create({
          message: msg,
          duration: 3000,
          color: 'success'
        });
        await toast.present();
        this.modalCtrl.dismiss({ saved: true, movement }, 'saved');
      },
      error: async (err) => {
        this.isSubmitting = false;
        const errMsg = err?.error?.message || this.transloco.translate('STOCK.WASTE_ERROR');
        const toast = await this.toastCtrl.create({
          message: errMsg,
          duration: 3500,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  /**
   * Dismisses the modal dialog without saving.
   */
  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
