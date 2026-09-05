import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonList,
  IonItem,
  IonToggle,
  IonSpinner,
  IonBadge,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  wineOutline,
  nutritionOutline,
  warningOutline,
  checkmarkCircleOutline,
  removeCircleOutline,
  addCircleOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { DashboardBarmanService } from '../../services/dashboard-barman.service';
import { Cocktail } from '../../../../core/models/cocktail.model';
import { Ingredient } from '../../../../core/models/ingredient.model';

/**
 * Modal component allowing barmen to instantly toggle cocktails and ingredients out of stock
 * or update stock levels on the fly during active service ("Quick Out-of-Stock").
 */
@Component({
  selector: 'app-ruptures-modal',
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
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonList,
    IonItem,
    IonToggle,
    IonSpinner,
    IonBadge
  ],
  templateUrl: './ruptures-modal.component.html',
  styleUrls: ['./ruptures-modal.component.scss']
})
export class RupturesModalComponent implements OnInit, OnDestroy {
  activeTab: 'cocktails' | 'ingredients' = 'cocktails';
  searchQuery = '';

  cocktails: Cocktail[] = [];
  ingredients: Ingredient[] = [];
  isLoading = false;

  private readonly destroy$ = new Subject<void>();
  private readonly dashboardService = inject(DashboardBarmanService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      closeOutline,
      wineOutline,
      nutritionOutline,
      warningOutline,
      checkmarkCircleOutline,
      removeCircleOutline,
      addCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads both cocktails and ingredients concurrently.
   */
  loadData(): void {
    this.isLoading = true;
    forkJoin({
      cocktails: this.dashboardService.getCocktails(),
      ingredients: this.dashboardService.getIngredients()
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ({ cocktails, ingredients }) => {
          this.cocktails = cocktails;
          this.ingredients = ingredients;
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('BARMAN_DASHBOARD.LOAD_STOCK_ERROR'),
            duration: 3000,
            color: 'danger'
          });
          toast.present();
        }
      });
  }

  /**
   * Filtered cocktails based on the current search input.
   */
  get filteredCocktails(): Cocktail[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.cocktails;
    return this.cocktails.filter(
      c => c.nom.toLowerCase().includes(q) || c.categorie.toLowerCase().includes(q)
    );
  }

  /**
   * Filtered ingredients based on the current search input.
   */
  get filteredIngredients(): Ingredient[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.ingredients;
    return this.ingredients.filter(
      i => i.nom.toLowerCase().includes(q) || i.uniteMesure.toLowerCase().includes(q)
    );
  }

  /**
   * Number of currently unavailable cocktails.
   */
  get outOfStockCocktailsCount(): number {
    return this.cocktails.filter(c => !c.disponible).length;
  }

  /**
   * Number of ingredients in low/zero stock.
   */
  get outOfStockIngredientsCount(): number {
    return this.ingredients.filter(i => (i.quantiteStock || 0) <= (i.seuilAlerte || 0)).length;
  }

  /**
   * Toggles cocktail availability immediately.
   *
   * @param cocktail The target cocktail
   */
  toggleCocktail(cocktail: Cocktail): void {
    const previousState = cocktail.disponible;
    cocktail.disponible = !previousState;

    this.dashboardService
      .toggleCocktailDisponibilite(cocktail.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          cocktail.disponible = updated.disponible;
          const msg = cocktail.disponible
            ? this.transloco.translate('BARMAN_DASHBOARD.COCKTAIL_AVAILABLE', { name: cocktail.nom })
            : this.transloco.translate('BARMAN_DASHBOARD.COCKTAIL_OUT_OF_STOCK', { name: cocktail.nom });
          this.showToast(msg, cocktail.disponible ? 'success' : 'warning');
        },
        error: () => {
          cocktail.disponible = previousState;
          this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
        }
      });
  }

  /**
   * Adjusts ingredient stock count by an increment/decrement delta or sets to 0.
   *
   * @param ingredient Target ingredient
   * @param newStock New stock value
   */
  updateStock(ingredient: Ingredient, newStock: number): void {
    const validStock = Math.max(0, newStock);
    this.dashboardService
      .updateIngredientStock(ingredient.id, validStock)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          ingredient.quantiteStock = updated.quantiteStock;
          this.showToast(
            this.transloco.translate('BARMAN_DASHBOARD.STOCK_UPDATED', {
              name: ingredient.nom,
              stock: validStock,
              unit: ingredient.uniteMesure
            }),
            validStock === 0 ? 'warning' : 'success'
          );
        },
        error: () => {
          this.showToast(this.transloco.translate('COMMON.ERROR'), 'danger');
        }
      });
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
