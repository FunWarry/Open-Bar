import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, firstValueFrom } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin, selectCanEditIngredient } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSpinner,
  IonGrid, IonRow, IonCol, IonProgressBar,
  ToastController, ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add, eye, create, trash, addCircle, removeCircle,
  removeOutline, addOutline, trashOutline,
  gridOutline, listOutline, pulseOutline, search, swapVerticalOutline,
  scaleOutline, layersOutline, checkmarkCircleOutline, closeCircleOutline,
  alertCircleOutline, wineOutline, waterOutline, colorFillOutline,
  nutritionOutline, cubeOutline, downloadOutline,
  flaskOutline, beerOutline, sparklesOutline, leafOutline,
  cartOutline, barcodeOutline
} from 'ionicons/icons';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IngredientService } from '../../../core/services/ingredient.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import {
  Ingredient,
  INGREDIENT_UNITS,
  INGREDIENT_CATEGORY_CONFIG
} from '../../../core/models/ingredient.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';
import { IngredientFormComponent } from '../ingredient-form/ingredient-form.component';
import { StockWasteModalComponent } from '../stock-waste-modal/stock-waste-modal.component';
import { SearchBarComponent } from '../../../core/components/ui/search-bar/search-bar.component';
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';
import { ActionButtonComponent } from '../../../core/components/ui/action-button/action-button.component';
import { PaginationComponent } from '../../../core/components/ui/pagination/pagination.component';
import { CsvExportService, CsvColumn } from '../../../core/services/csv-export.service';
import { StockWasteService } from '../../../core/services/stock-waste.service';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { BarcodeScannerModalComponent, BarcodeScannerResult } from '../../../core/components/ui/barcode-scanner-modal/barcode-scanner-modal.component';

/**
 * Display modes for inventory ingredient list:
 * - 'category': Grouped cards under category section headers
 * - 'grid': Flat responsive card grid of all ingredients with pagination
 * - 'list': Detailed tabular row list view
 */
export type StockViewMode = 'category' | 'grid' | 'list';

/**
 * Sorting options for inventory ingredient list.
 */

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

export interface IngredientCategoryGroup {
  categoryKey: string;
  categoryLabel: string;
  icon: string;
  badgeType: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  items: Ingredient[];
}

/**
 * Global Barman & Manager Stock Management View component in OpenBar (Figma 488:3566).
 * Features visual stock gauges, alert thresholds, multi-criteria filters (status, category, unit, sorting),
 * searchable dropdowns, categorized sections with dividers, quick stock adjustment, and live WebSocket stream updates.
 */
@Component({
  selector: 'app-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['./ingredient-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule, FormsModule, AsyncPipe, TranslocoModule,
    IonContent, IonCard, IonCardHeader, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSpinner, SearchBarComponent,
    IonGrid, IonRow, IonCol, IonProgressBar,
    SearchableSelectComponent, ActionButtonComponent, PaginationComponent
  ],
})
export class IngredientListComponent implements OnInit, OnDestroy {
  private readonly featureFlagService = inject(FeatureFlagService);
  readonly suppliersManagementEnabled = this.featureFlagService.suppliersManagementEnabled;

  ingredients: Ingredient[] = [];
  isLoading = false;
  searchQuery = '';
  selectedStatus: StockStatusFilter = 'ALL';
  selectedCategory = 'ALL';
  selectedUnit = 'ALL';
  sortOption: StockSortOption = 'NAME_ASC';
  viewMode: StockViewMode = 'category';
  gridPage = 1;
  gridPageSize = 16;

  readonly availableUnits: readonly string[] = INGREDIENT_UNITS;

  get categoryOptions(): SearchableOption<string>[] {
    return [
      { value: 'ALL', label: this.transloco.translate('STOCK.ALL_CATEGORIES'), icon: 'layers-outline' },
      ...INGREDIENT_CATEGORY_CONFIG.map(cat => ({
        value: cat.key,
        label: this.transloco.translate(cat.labelKey),
        icon: cat.icon,
        badgeType: cat.badgeType
      }))
    ];
  }

  get unitOptions(): SearchableOption<string>[] {
    return [
      { value: 'ALL', label: this.transloco.translate('STOCK.ALL_UNITS'), icon: 'scale-outline' },
      ...this.availableUnits.map(u => {
        const key = u.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const transKey = `INGREDIENTS.UNITS.${key}.LABEL`;
        const translated = this.transloco.translate(transKey);
        return {
          value: u,
          label: translated && translated !== transKey ? translated : u,
          badge: u
        };
      }),
    ];
  }

  get sortOptions(): SearchableOption<StockSortOption>[] {
    return [
      { value: 'NAME_ASC', label: this.transloco.translate('STOCK.SORT.NAME_ASC'), icon: 'swap-vertical-outline' },
      { value: 'NAME_DESC', label: this.transloco.translate('STOCK.SORT.NAME_DESC'), icon: 'swap-vertical-outline' },
      { value: 'STOCK_ASC', label: this.transloco.translate('STOCK.SORT.STOCK_ASC'), icon: 'swap-vertical-outline' },
      { value: 'STOCK_DESC', label: this.transloco.translate('STOCK.SORT.STOCK_DESC'), icon: 'swap-vertical-outline' },
      { value: 'THRESHOLD_ASC', label: this.transloco.translate('STOCK.SORT.THRESHOLD_ASC'), icon: 'swap-vertical-outline' },
      { value: 'THRESHOLD_DESC', label: this.transloco.translate('STOCK.SORT.THRESHOLD_DESC'), icon: 'swap-vertical-outline' },
      { value: 'STATUS_ALERT', label: this.transloco.translate('STOCK.SORT.STATUS_ALERT'), icon: 'alert-circle-outline' },
      { value: 'CATEGORY', label: this.transloco.translate('STOCK.SORT.CATEGORY'), icon: 'layers-outline' },
    ];
  }

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
    private readonly csvExportService: CsvExportService,
    private readonly stockWasteService: StockWasteService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.canEdit$ = this.store.select(selectCanEditIngredient);
    addIcons({
      add, eye, create, trash, addCircle, removeCircle,
      removeOutline, addOutline, trashOutline,
      gridOutline, listOutline, pulseOutline, search, swapVerticalOutline,
      scaleOutline, layersOutline, checkmarkCircleOutline, closeCircleOutline,
      alertCircleOutline, wineOutline, waterOutline, colorFillOutline,
      nutritionOutline, cubeOutline, downloadOutline,
      flaskOutline, beerOutline, sparklesOutline, leafOutline,
      cartOutline, barcodeOutline
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
        next: ingredients => {
          this.ingredients = ingredients;
        },
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
    this.gridPage = 1;
  }

  onCategorySelected(option: SearchableOption<string> | null): void {
    this.selectedCategory = option?.value || 'ALL';
    this.gridPage = 1;
  }

  onUnitSelected(option: SearchableOption<string> | null): void {
    this.selectedUnit = option?.value || 'ALL';
    this.gridPage = 1;
  }

  onSortSelected(option: SearchableOption<StockSortOption> | null): void {
    if (option?.value) {
      this.sortOption = option.value;
      this.gridPage = 1;
    }
  }

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory = select.value;
    this.gridPage = 1;
  }

  /**
   * Opens barcode scanner modal and sets search query with scanned barcode.
   */
  async scanBarcode(): Promise<void> {
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
      this.searchQuery = data.barcode;
      this.onSearchChange();
    }
  }

  /**
   * Navigates to the purchases and supplier orders management view.
   */
  goToPurchases(): void {
    this.router.navigate(['/purchases']);
  }

  onUnitChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedUnit = select.value;
    this.gridPage = 1;
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOption = select.value as StockSortOption;
    this.gridPage = 1;
  }

  onSearchChange(): void {
    this.gridPage = 1;
  }

  setViewMode(mode: StockViewMode): void {
    this.viewMode = mode;
    if (mode === 'grid') {
      this.gridPage = 1;
    }
  }

  /** Total number of pages for flat grid mode based on page size. */
  get totalGridPages(): number {
    return Math.ceil(this.filteredIngredients.length / this.gridPageSize) || 1;
  }

  /** Slice of filtered ingredients displayed on the current grid page. */
  get paginatedGridIngredients(): Ingredient[] {
    const start = (this.gridPage - 1) * this.gridPageSize;
    return this.filteredIngredients.slice(start, start + this.gridPageSize);
  }

  /** First item index (1-based) on the current grid page for summary display. */
  get gridPaginationStart(): number {
    return this.filteredIngredients.length === 0 ? 0 : (this.gridPage - 1) * this.gridPageSize + 1;
  }

  /** Last item index (1-based) on the current grid page for summary display. */
  get gridPaginationEnd(): number {
    return Math.min(this.gridPage * this.gridPageSize, this.filteredIngredients.length);
  }

  /** Generates array of page numbers or ellipsis indicator (-1) for pagination UI. */
  get gridPageNumbers(): number[] {
    const total = this.totalGridPages;
    const current = this.gridPage;
    const pages: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      const left = Math.max(2, current - 1);
      const right = Math.min(total - 1, current + 1);
      pages.push(1);
      if (left > 2) {
        pages.push(-1);
      }
      for (let i = left; i <= right; i++) {
        pages.push(i);
      }
      if (right < total - 1) {
        pages.push(-2);
      }
      pages.push(total);
    }
    return pages;
  }

  /** Selects a specific page in flat grid mode. */
  setGridPage(page: number): void {
    if (page >= 1 && page <= this.totalGridPages) {
      this.gridPage = page;
    }
  }

  /** Moves to the previous page in flat grid mode. */
  prevGridPage(): void {
    if (this.gridPage > 1) {
      this.gridPage--;
    }
  }

  /** Moves to the next page in flat grid mode. */
  nextGridPage(): void {
    if (this.gridPage < this.totalGridPages) {
      this.gridPage++;
    }
  }

  /** Updates the items per page count in flat grid mode. */
  setGridPageSize(size: number): void {
    this.gridPageSize = size;
    this.gridPage = 1;
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
   * Returns filtered ingredients grouped by their category with icons and counters.
   */
  get groupedIngredients(): IngredientCategoryGroup[] {
    const filtered = this.filteredIngredients;
    const result: IngredientCategoryGroup[] = [];

    for (const def of INGREDIENT_CATEGORY_CONFIG) {
      const items = filtered.filter(item => this.getIngredientCategory(item) === def.key);
      if (items.length > 0) {
        result.push({
          categoryKey: def.key,
          categoryLabel: this.transloco.translate(def.labelKey),
          icon: def.icon,
          badgeType: def.badgeType,
          items
        });
      }
    }

    return result;
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

      const category = this.getIngredientCategory(item);
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
          const catA = this.getIngredientCategory(a);
          const catB = this.getIngredientCategory(b);
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
   * Resolves the mixology category directly from the ingredient entity's category property.
   * Does not use hardcoded keyword matching; uses the category defined in the data.
   * @param item Target ingredient or category key string
   */
  getIngredientCategory(item: Ingredient | string): string {
    if (typeof item === 'string') {
      return INGREDIENT_CATEGORY_CONFIG.some(c => c.key === item) ? item : 'other';
    }
    const cat = item?.category;
    if (cat && INGREDIENT_CATEGORY_CONFIG.some(c => c.key === cat)) {
      return cat;
    }
    return 'other';
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
   * Formats the equivalent packaging quantity string for an ingredient (e.g., "≈ 2.5 Bottle 70cl").
   * Returns empty string if no packaging capacity or packaging unit is missing.
   * @param ingredient Target ingredient
   */
  getPackagingEquivalent(ingredient: Ingredient): string {
    const capacity = ingredient.packagingCapacity;
    const unit = ingredient.purchaseUnit;
    if (!capacity || capacity <= 0 || !unit) {
      return '';
    }
    const count = (ingredient.quantiteStock / capacity).toFixed(1).replace(/\.0$/, '');
    return `≈ ${count} ${unit}`;
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

  /**
   * Opens the stock waste declaration modal for a specific ingredient or general shrinkage.
   *
   * @param ingredient Optional target ingredient
   */
  async openWasteModal(ingredient?: Ingredient): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: StockWasteModalComponent,
      componentProps: {
        ingredient: ingredient ?? null,
        preselectedIngredientId: ingredient ? ingredient.id : null,
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

  /**
   * Exports the currently displayed ingredients inventory to CSV.
   */
  exportInventoryCsv(): void {
    const list = this.filteredIngredients;
    if (!list || list.length === 0) {
      return;
    }

    const columns: CsvColumn<Ingredient>[] = [
      { key: 'id', header: 'ID' },
      { key: 'nom', header: 'Nom' },
      { key: 'quantiteStock', header: 'Stock_Actuel' },
      { key: 'seuilAlerte', header: 'Seuil_Alerte' },
      { key: 'uniteMesure', header: 'Unite' },
      {
        key: 'unitCost',
        header: 'Cout_Unitaire_EUR',
        formatter: (val, item) => {
          const cost = val ?? item.prixUnitaire;
          return cost != null ? Number(cost).toFixed(2) : '0.00';
        }
      },
      { key: 'fournisseur', header: 'Fournisseur' },
      { key: 'numeroLot', header: 'Numero_Lot' },
      { key: 'datePeremption', header: 'Date_Peremption' },
      {
        header: 'Statut',
        formatter: (_, item) => {
          if (item.quantiteStock <= 0) return 'RUPTURE';
          if (item.quantiteStock <= item.seuilAlerte) return 'ALERTE';
          return 'NORMAL';
        }
      }
    ];

    this.csvExportService.exportTable(list, columns, 'inventaire_ingredients');
  }

  /**
   * Fetches shrinkage and breakage movements and exports them to CSV.
   */
  exportWasteMovementsCsv(): void {
    this.stockWasteService.getMovements().pipe(takeUntil(this.destroy$)).subscribe({
      next: (movements) => {
        if (!movements || movements.length === 0) {
          this.toastCtrl.create({
            message: this.transloco.translate('CSV_EXPORT.NO_DATA'),
            duration: 2500,
            color: 'warning'
          }).then(t => t.present());
          return;
        }

        const columns = this.stockWasteService.getWasteMovementCsvColumns();
        this.csvExportService.exportTable(movements, columns, 'pertes_stock');
      }
    });
  }

  trackById(_: number, item: Ingredient): number {
    return item.id;
  }
}
