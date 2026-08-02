import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin, selectCanEditIngredient } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSpinner, IonSearchbar,
  IonSegment, IonSegmentButton, IonGrid, IonRow, IonCol, IonProgressBar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, eye, create, trash, addCircle, removeCircle,
  gridOutline, listOutline, pulseOutline, search
} from 'ionicons/icons';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Ingredient } from '../../../core/models/ingredient.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * Global Barman & Manager Stock Management View component in OpenBar (Figma 488:3566).
 * Features visual stock gauges, alert thresholds, category and text filters,
 * quick stock adjustment (+/-), view mode toggles (grid/list), and live WebSocket stream updates.
 */
@Component({
  selector: 'app-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['./ingredient-list.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, AsyncPipe, TranslocoModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSpinner, IonSearchbar,
    IonSegment, IonSegmentButton, IonGrid, IonRow, IonCol, IonProgressBar,
  ],
})
export class IngredientListComponent implements OnInit, OnDestroy {
  ingredients: Ingredient[] = [];
  isLoading = false;
  searchQuery = '';
  selectedCategory = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  isAdmin$: Observable<boolean>;
  canEdit$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly ingredientService: IngredientService,
    private readonly webSocketService: WebSocketService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.canEdit$ = this.store.select(selectCanEditIngredient);
    addIcons({
      add, eye, create, trash, addCircle, removeCircle,
      gridOutline, listOutline, pulseOutline, search
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

  /**
   * Returns filtered list of ingredients based on search query and selected category filter.
   */
  get filteredIngredients(): Ingredient[] {
    const query = this.searchQuery.toLowerCase();
    return this.ingredients.filter(item => {
      const matchesSearch = !query ||
        item.nom.toLowerCase().includes(query) ||
        (item.fournisseur?.toLowerCase()?.includes(query) ?? false);

      const category = this.getIngredientCategory(item.nom);
      const matchesCategory = this.selectedCategory === 'ALL' || category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
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
    const updated = { ...ingredient, quantiteStock: newQty };

    this.ingredientService.update(ingredient.id, updated)
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

  onAdd(): void {
    this.router.navigate(['/ingredients/new']);
  }

  onView(i: Ingredient): void {
    this.router.navigate(['/ingredients', i.id]);
  }

  onEdit(i: Ingredient): void {
    this.router.navigate(['/ingredients', i.id, 'edit']);
  }

  onRefresh(event: any): void {
    this.charger(event);
  }

  trackById(_: number, item: Ingredient): number {
    return item.id;
  }
}
