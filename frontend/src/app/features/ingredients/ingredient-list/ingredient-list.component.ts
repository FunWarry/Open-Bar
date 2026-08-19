import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, firstValueFrom } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin, selectCanEditIngredient } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSpinner, IonSearchbar,
  IonGrid, IonRow, IonCol, IonProgressBar,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, eye, create, trash, addCircle, removeCircle,
  removeOutline, addOutline, trashOutline,
  gridOutline, listOutline, pulseOutline, search, swapVerticalOutline,
  scaleOutline, layersOutline, checkmarkCircleOutline, closeCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Ingredient } from '../../../core/models/ingredient.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';
import { IngredientFormComponent } from '../ingredient-form/ingredient-form.component';

export type StockSortOption =
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'STOCK_ASC'
  | 'STOCK_DESC'
  | 'THRESHOLD_ASC'
  | 'THRESHOLD_DESC'
  | 'STATUS_ALERT'
  | 'CATEGORY';

export type StockStatusFilter = 'ALL' | 'NORMAL' | 'ALERT' | 'OUT_OF_STOCK';

/**
 * Global Barman & Manager Stock Management View component in OpenBar (Figma 488:3566).
 * Features visual stock gauges, alert thresholds, multi-criteria filters (status, category, unit, sorting),
 * quick stock adjustment (+/-), view mode toggles (grid/list), and live WebSocket stream updates.
 */
@Component({
  selector: 'app-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['./ingredient-list.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, AsyncPipe, TranslocoModule,
    IonContent, IonCard, IonCardHeader, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSpinner, IonSearchbar,
    IonGrid, IonRow, IonCol, IonProgressBar,
  ],
})
export class IngredientListComponent implements OnInit, OnDestroy {
  ingredients: Ingredient[] = [];
  isLoading = false;
  searchQuery = '';
  selectedStatus: StockStatusFilter = 'ALL';
  selectedCategory = 'ALL';
  selectedUnit = 'ALL';
  sortOption: StockSortOption = 'NAME_ASC';
  viewMode: 'grid' | 'list' = 'grid';

  readonly availableUnits: string[] = ['cl', 'ml', 'g', 'kg', 'pièce', 'L'];

  isAdmin$: Observable<boolean>;
  canEdit$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly ingredientService: IngredientService,
    private readonly webSocketService: WebSocketService,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
    private readonly transloco: TranslocoService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.canEdit$ = this.store.select(selectCanEditIngredient);
    addIcons({
      add, eye, create, trash, addCircle, removeCircle,
      removeOutline, addOutline, trashOutline,
      gridOutline, listOutline, pulseOutline, search, swapVerticalOutline,
      scaleOutline, layersOutline, checkmarkCircleOutline, closeCircleOutline,
      alertCircleOutline
    });
  }

  ngOnInit(): void {
    this.charger();
    this.initWebSocketStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initializes WebSocket listener for live stock alert topic.
   */
  private initWebSocketStream(): void {
    this.webSocketService.watch('/topic/stock/alerte')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.charger();
      });
  }

  /**
   * Fetches all inventory ingredients from backend API.
   * @param refreshEvent Optional IonRefresher event for pull-to-refresh
   */
  charger(refreshEvent?: any): void {
    this.isLoading = true;
    this.ingredientService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        }),
      )
      .subscribe({
        next: ingredients => (this.ingredients = ingredients),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('COMMON.ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  setStatusFilter(status: StockStatusFilter): void {
    this.selectedStatus = status;
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory = select.value;
  }

  onUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedUnit = select.value;
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOption = select.value as StockSortOption;
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  get normalCount(): number {
    return this.ingredients.filter(i => i.quantiteStock > i.seuilAlerte).length;
  }

  get alertCount(): number {
    return this.ingredients.filter(i => i.quantiteStock > 0 && i.quantiteStock <= i.seuilAlerte).length;
  }

  get outOfStockCount(): number {
    return this.ingredients.filter(i => i.quantiteStock <= 0).length;
  }

  /**
   * Returns filtered and sorted list of ingredients based on search query, status, category, unit and sort option.
   */
  get filteredIngredients(): Ingredient[] {
    const query = this.searchQuery.toLowerCase().trim();
    const result = this.ingredients.filter(item => {
      const matchesSearch = !query ||
        item.nom.toLowerCase().includes(query) ||
        (item.uniteMesure?.toLowerCase()?.includes(query) ?? false) ||
        (item.fournisseur?.toLowerCase()?.includes(query) ?? false);

      const category = this.getIngredientCategory(item.nom);
      const matchesCategory = this.selectedCategory === 'ALL' || category === this.selectedCategory;

      const matchesUnit = this.selectedUnit === 'ALL' || item.uniteMesure === this.selectedUnit;

      let matchesStatus = true;
      if (this.selectedStatus === 'NORMAL') {
        matchesStatus = item.quantiteStock > item.seuilAlerte;
      } else if (this.selectedStatus === 'ALERT') {
        matchesStatus = item.quantiteStock > 0 && item.quantiteStock <= item.seuilAlerte;
      } else if (this.selectedStatus === 'OUT_OF_STOCK') {
        matchesStatus = item.quantiteStock <= 0;
      }

      return matchesSearch && matchesCategory && matchesUnit && matchesStatus;
    });

    result.sort((a, b) => {
      switch (this.sortOption) {
        case 'NAME_ASC':
          return (a.nom || '').localeCompare(b.nom || '');
        case 'NAME_DESC':
          return (b.nom || '').localeCompare(a.nom || '');
        case 'STOCK_ASC':
          return a.quantiteStock - b.quantiteStock || (a.nom || '').localeCompare(b.nom || '');
        case 'STOCK_DESC':
          return b.quantiteStock - a.quantiteStock || (a.nom || '').localeCompare(b.nom || '');
        case 'THRESHOLD_ASC':
          return a.seuilAlerte - b.seuilAlerte || (a.nom || '').localeCompare(b.nom || '');
        case 'THRESHOLD_DESC':
          return b.seuilAlerte - a.seuilAlerte || (a.nom || '').localeCompare(b.nom || '');
        case 'STATUS_ALERT': {
          const aAlert = this.getStockAlertScore(a);
          const bAlert = this.getStockAlertScore(b);
          return bAlert - aAlert || a.quantiteStock - b.quantiteStock;
        }
        case 'CATEGORY': {
          const catA = this.getIngredientCategory(a.nom);
          const catB = this.getIngredientCategory(b.nom);
          return catA.localeCompare(catB) || (a.nom || '').localeCompare(b.nom || '');
        }
        default:
          return (a.nom || '').localeCompare(b.nom || '');
      }
    });

    return result;
  }

  /**
   * Returns a numerical score representing the severity of the ingredient stock alert.
   * @param item Target ingredient
   */
  private getStockAlertScore(item: Ingredient): number {
    if (item.quantiteStock <= 0) return 2;
    if (this.isEnAlerte(item)) return 1;
    return 0;
  }

  /**
   * Categorizes an ingredient based on its name keywords.
   * @param name Name of the ingredient
   */
  getIngredientCategory(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('rhum') || n.includes('vodka') || n.includes('gin') || n.includes('tequila') ||
        n.includes('whisky') || n.includes('cognac') || n.includes('bourbon') || n.includes('liqueur') ||
        n.includes('aperol') || n.includes('campari') || n.includes('cointreau') || n.includes('triple sec')) {
      return 'SPIRITS';
    }
    if (n.includes('coca') || n.includes('tonic') || n.includes('soda') || n.includes('jus') ||
        n.includes('eau') || n.includes('limonade') || n.includes('ginger') || n.includes('sprite')) {
      return 'SOFTS';
    }
    if (n.includes('sirop') || n.includes('sucre') || n.includes('canne') || n.includes('grenadine') ||
        n.includes('vanille') || n.includes('orgeat')) {
      return 'SYRUPS';
    }
    if (n.includes('citron') || n.includes('menthe') || n.includes('fraise') || n.includes('framboise') ||
        n.includes('orange') || n.includes('ananas') || n.includes('concombre') || n.includes('fruit')) {
      return 'FRUITS';
    }
    return 'OTHER';
  }

  /**
   * Calculates stock percentage (0 to 1) for progress bar visualization.
   * @param ingredient Target ingredient
   */
  getStockRatio(ingredient: Ingredient): number {
    const maxCapacity = Math.max(ingredient.seuilAlerte * 3, 100);
    return Math.min(Math.max(ingredient.quantiteStock / maxCapacity, 0), 1);
  }

  /**
   * Calculates stock percentage value (0 to 100).
   * @param ingredient Target ingredient
   */
  getStockPercentage(ingredient: Ingredient): number {
    return Math.round(this.getStockRatio(ingredient) * 100);
  }

  /**
   * Resolves Ionic color name based on stock level relative to alert threshold.
   * @param ingredient Target ingredient
   */
  getStockColor(ingredient: Ingredient): string {
    if (ingredient.quantiteStock <= 0) return 'danger';
    if (ingredient.quantiteStock <= ingredient.seuilAlerte) return 'warning';
    return 'success';
  }

  /**
   * Checks if an ingredient is currently under its alert threshold.
   * @param ingredient Target ingredient
   */
  isEnAlerte(ingredient: Ingredient): boolean {
    return ingredient.quantiteStock <= ingredient.seuilAlerte;
  }

  /**
   * Quickly adjusts ingredient stock by delta amount (+1 / -1 / +10).
   * @param ingredient Target ingredient
   * @param delta Quantity adjustment offset
   */
  adjustStock(ingredient: Ingredient, delta: number): void {
    const newQty = Math.max(0, (ingredient.quantiteStock || 0) + delta);
    this.ingredientService.updateStock(ingredient.id, newQty)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          ingredient.quantiteStock = newQty;
          const msg = this.transloco.translate('STOCK.ADJUST_SUCCESS', {
            name: ingredient.nom,
            qty: newQty,
            unit: ingredient.uniteMesure
          });
          const toast = await this.toastCtrl.create({
            message: msg,
            duration: 2000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('STOCK.ADJUST_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Deletes an ingredient from the system.
   * @param ingredient Target ingredient
   */
  onDelete(ingredient: Ingredient): void {
    this.ingredientService.delete(ingredient.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.ingredients = this.ingredients.filter(i => i.id !== ingredient.id);
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('INGREDIENTS.DELETE_SUCCESS'),
            duration: 3000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('INGREDIENTS.DELETE_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Opens the ingredient form modal for creating, viewing, or editing an ingredient.
   * @param ingredient Optional ingredient to view or edit
   */
  async openIngredientModal(ingredient?: Ingredient): Promise<void> {
    let canEdit = true;
    try {
      canEdit = await firstValueFrom(this.canEdit$);
    } catch {
      canEdit = true;
    }

    const modal = await this.modalCtrl.create({
      component: IngredientFormComponent,
      componentProps: {
        ingredient: ingredient ?? null,
        canEdit,
      },
    });

    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'saved') {
      this.charger();
    }
  }

  onAdd(): void {
    this.openIngredientModal();
  }

  onEdit(i: Ingredient): void {
    this.openIngredientModal(i);
  }

  onRefresh(event: any): void {
    this.charger(event);
  }

  trackById(_: number, item: Ingredient): number {
    return item.id;
  }
}
