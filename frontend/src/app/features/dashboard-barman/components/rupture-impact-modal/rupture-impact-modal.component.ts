import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonFooter,
  IonSpinner,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  warningOutline,
  alertCircleOutline,
  arrowUndoOutline,
  wineOutline,
  refreshOutline,
  checkmarkCircleOutline,
  checkboxOutline,
  squareOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, finalize, takeUntil } from 'rxjs';
import { Ingredient } from '../../../../core/models/ingredient.model';
import { Cocktail } from '../../../../core/models/cocktail.model';
import { DashboardBarmanService } from '../../services/dashboard-barman.service';

/**
 * Modal dialog displaying the impact of an ingredient out-of-stock situation on associated cocktails.
 * Allows the bartender to:
 * 1. Verify physical inventory and quickly restock if unrecorded supply exists.
 * 2. Inspect all cocktails using the ingredient.
 * 3. Batch toggle affected cocktails to out-of-stock in a single click.
 * 4. Or maintain cocktail availability if an alternate/substitute solution exists.
 */
@Component({
  selector: 'app-rupture-impact-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonFooter,
    IonSpinner
  ],
  templateUrl: './rupture-impact-modal.component.html',
  styleUrls: ['./rupture-impact-modal.component.scss']
})
export class RuptureImpactModalComponent implements OnInit, OnDestroy {
  @Input() ingredient!: Ingredient;
  @Input() affectedCocktails: Cocktail[] = [];
  @Input() source: 'manual' | 'automatic' = 'manual';

  isLoadingCocktails = false;
  isProcessing = false;
  quickRestockQty: number | null = null;
  selectedCocktailIds: Set<number> = new Set<number>();

  private readonly destroy$ = new Subject<void>();
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly dashboardService = inject(DashboardBarmanService);

  constructor() {
    addIcons({
      closeOutline,
      warningOutline,
      alertCircleOutline,
      arrowUndoOutline,
      wineOutline,
      refreshOutline,
      checkmarkCircleOutline,
      checkboxOutline,
      squareOutline
    });
  }

  ngOnInit(): void {
    if (!this.affectedCocktails || this.affectedCocktails.length === 0) {
      this.loadAffectedCocktails();
    } else {
      this.initializeDefaultSelection();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all cocktails that depend on the current ingredient.
   */
  loadAffectedCocktails(): void {
    if (!this.ingredient?.id) return;
    this.isLoadingCocktails = true;
    this.dashboardService.getCocktailsByIngredient(this.ingredient.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingCocktails = false))
      )
      .subscribe({
        next: cocktails => {
          this.affectedCocktails = cocktails || [];
          this.initializeDefaultSelection();
        },
        error: () => {
          this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
        }
      });
  }

  /**
   * Initializes selection map with all currently available cocktails pre-checked.
   */
  private initializeDefaultSelection(): void {
    this.selectedCocktailIds.clear();
    for (const cocktail of this.affectedCocktails) {
      if (cocktail.disponible !== false) {
        this.selectedCocktailIds.add(cocktail.id);
      }
    }
  }

  /**
   * Checks whether a cocktail is currently selected for out-of-stock cascade.
   *
   * @param cocktailId Unique cocktail identifier
   * @returns Boolean indicating selection
   */
  isSelected(cocktailId: number): boolean {
    return this.selectedCocktailIds.has(cocktailId);
  }

  /**
   * Toggles the selection status for a specific cocktail.
   *
   * @param cocktailId Unique cocktail identifier
   */
  toggleCocktailSelection(cocktailId: number): void {
    if (this.selectedCocktailIds.has(cocktailId)) {
      this.selectedCocktailIds.delete(cocktailId);
    } else {
      this.selectedCocktailIds.add(cocktailId);
    }
  }

  /**
   * Selects all cocktails that are currently available.
   */
  selectAll(): void {
    for (const cocktail of this.affectedCocktails) {
      if (cocktail.disponible !== false) {
        this.selectedCocktailIds.add(cocktail.id);
      }
    }
  }

  /**
   * Deselects all cocktails.
   */
  deselectAll(): void {
    this.selectedCocktailIds.clear();
  }

  /**
   * Restocks the ingredient physical inventory with a positive quantity,
   * cancelling the out-of-stock state.
   */
  applyQuickRestock(): void {
    if (!this.quickRestockQty || this.quickRestockQty <= 0) {
      return;
    }
    this.isProcessing = true;
    this.dashboardService.updateIngredientStock(this.ingredient.id, this.quickRestockQty)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isProcessing = false))
      )
      .subscribe({
        next: updated => {
          this.ingredient.quantiteStock = updated.quantiteStock;
          const msg = this.transloco.translate('BARMAN_DASHBOARD.RUPTURE_IMPACT.RESTOCK_SUCCESS', {
            name: this.ingredient.nom,
            qty: this.quickRestockQty,
            unit: this.ingredient.uniteMesure
          });
          this.showToast(msg, 'success');
          this.modalCtrl.dismiss({ action: 'restocked', newStock: this.quickRestockQty });
        },
        error: () => {
          this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
        }
      });
  }

  /**
   * Confirms the out-of-stock cascade: sets selected cocktails to unavailable (disponible = false),
   * sets the ingredient stock to 0 if not already zero, and closes the modal.
   */
  confirmCascade(): void {
    const selectedIds = Array.from(this.selectedCocktailIds);
    this.isProcessing = true;

    // First ensure ingredient stock is set to 0 if coming from manual trigger
    const updateStock$ = (this.ingredient.quantiteStock !== 0)
      ? this.dashboardService.updateIngredientStock(this.ingredient.id, 0)
      : null;

    const executeBatchCascade = () => {
      if (selectedIds.length === 0) {
        this.isProcessing = false;
        this.modalCtrl.dismiss({ action: 'ingredient_only' });
        return;
      }

      this.dashboardService.setCocktailsDisponibiliteBatch(selectedIds, false)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isProcessing = false))
        )
        .subscribe({
          next: () => {
            const msg = this.transloco.translate('BARMAN_DASHBOARD.RUPTURE_IMPACT.CASCADE_SUCCESS', {
              count: selectedIds.length,
              name: this.ingredient.nom
            });
            this.showToast(msg, 'warning');
            this.modalCtrl.dismiss({ action: 'cascaded', cocktailIds: selectedIds });
          },
          error: () => {
            this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
          }
        });
    };

    if (updateStock$) {
      updateStock$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => executeBatchCascade(),
          error: () => {
            this.isProcessing = false;
            this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
          }
        });
    } else {
      executeBatchCascade();
    }
  }

  /**
   * Closes the dialog without changing cocktail availability, only updating ingredient stock to 0 if needed.
   */
  keepCocktailsAvailable(): void {
    if (this.ingredient.quantiteStock !== 0) {
      this.isProcessing = true;
      this.dashboardService.updateIngredientStock(this.ingredient.id, 0)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isProcessing = false))
        )
        .subscribe({
          next: () => {
            const msg = this.transloco.translate('BARMAN_DASHBOARD.STOCK_UPDATED');
            this.showToast(msg, 'success');
            this.modalCtrl.dismiss({ action: 'ingredient_only' });
          },
          error: () => {
            this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
          }
        });
    } else {
      this.modalCtrl.dismiss({ action: 'cancel' });
    }
  }

  /**
   * Dismisses the modal without changes.
   */
  dismiss(): void {
    this.modalCtrl.dismiss({ action: 'cancel' });
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
