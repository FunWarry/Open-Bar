import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonIcon, IonBadge, IonSpinner,
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
  chatboxEllipsesOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { Ingredient } from '../../../core/models/ingredient.model';
import { IngredientService } from '../../../core/services/ingredient.service';
import { StockWasteService } from '../../../core/services/stock-waste.service';
import { StockWasteReason } from '../../../core/models/stock-waste.model';

/**
 * Modal component allowing barmen and managers to declare stock shrinkage, breakage,
 * expiration, complimentary rounds, staff tastings, and preparation spills.
 * Immediately deducts inventory balance and triggers low-stock alerts.
 */
@Component({
  selector: 'app-stock-waste-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    AppCurrencyPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonIcon,
    IonBadge,
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
      chatboxEllipsesOutline
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
   * Handles user selection of an ingredient from the dropdown.
   *
   * @param event The select change event
   */
  onIngredientChange(event: any): void {
    const id = event.detail?.value ?? this.selectedIngredientId;
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
