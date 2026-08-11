import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { switchMap, takeUntil, finalize, map } from 'rxjs/operators';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent,
  IonButton, IonIcon, IonBadge, IonChip, IonSpinner,
  IonFooter, IonToolbar as IonFooterToolbar,
  IonSearchbar, IonSelect, IonSelectOption,
  ToastController, ModalController,
} from '@ionic/angular/standalone';
import { TranslocoModule } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import {
  addOutline, removeOutline, trashOutline,
  checkmarkOutline, arrowBackOutline, colorWandOutline,
  searchOutline, filterOutline, closeCircleOutline,
  wineOutline, beerOutline, restaurantOutline, optionsOutline,
  alertCircleOutline, refreshOutline,
} from 'ionicons/icons';
import { DashboardServeurService } from '../services/dashboard-serveur.service';
import { CocktailService } from '../../../core/services/cocktail.service';
import { TableView } from '../models/table-view.model';
import { Cocktail } from '../../../core/models/cocktail.model';
import { AjouterItemRequest } from '../../../core/models/commande.model';
import {
  VarianteModalComponent,
  VarianteSelectionResult,
} from '../variante-modal/variante-modal.component';

/**
 * A single item in the local order cart.
 * Each entry represents one (cocktail, variant, notes) tuple, allowing the
 * same cocktail to appear multiple times with different customisations.
 */
export interface CartItem {
  /** Unique key: `cocktailId-varianteId-notes` for deduplication. */
  cartItemKey: string;
  cocktailId: number;
  cocktailNom: string;
  /** Effective price = base price + variant supplement. */
  prixUnitaire: number;
  quantite: number;
  /** Selected variant id, or undefined for the classic version. */
  varianteId?: number;
  /** Human-readable variant name, displayed in the cart. */
  varianteNom?: string;
  /** Optional free-text barman notes. */
  notes?: string;
}

/**
 * Screen allowing a server to compose and submit an order for a given table.
 *
 * Tapping a cocktail card opens the {@link VarianteModalComponent} to pick a
 * variant and enter optional barman notes. Each unique (cocktail + variant +
 * notes) combination results in a separate cart line.
 * Features live search, category chips, allergen exclusion filters, and VAT breakdown.
 */
@Component({
  selector: 'app-nouvelle-commande',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent,
    IonButton, IonIcon, IonBadge, IonChip, IonSpinner,
    IonFooter, IonFooterToolbar,
    IonSearchbar, IonSelect, IonSelectOption,
  ],
  templateUrl: './nouvelle-commande.component.html',
  styleUrls: ['./nouvelle-commande.component.scss'],
})
export class NouvelleCommandeComponent implements OnInit, OnDestroy {
  /** The table for which the order is being taken. */
  table: TableView | null = null;

  /** Available cocktails loaded from the API. */
  cocktails: Cocktail[] = [];

  /** Current cart contents. */
  cart: CartItem[] = [];

  /** True while the initial data (table + cocktails) is loading. */
  isLoading = false;

  /** True while the order creation request is in flight. */
  isSubmitting = false;

  /** Live search query typed by the user. */
  searchQuery = '';

  /** Selected product category filter ('ALL', 'ALCOOLISE', 'SANS_ALCOOL', 'BIERE', 'VIN', 'SNACK'). */
  selectedCategory = 'ALL';

  /** Selected allergen filter to exclude ('NONE', 'LACTOSE', 'GLUTEN', 'ARACHIDE', 'FRUITS_A_COQUE'). */
  selectedAllergen = 'NONE';

  /** Available product category filter keys. */
  readonly categories = ['ALL', 'ALCOOLISE', 'SANS_ALCOOL', 'BIERE', 'VIN', 'SNACK'];

  /** Available allergen filter keys to exclude. */
  readonly allergens = ['NONE', 'LACTOSE', 'GLUTEN', 'ARACHIDE', 'FRUITS_A_COQUE'];

  private tableId!: number;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: DashboardServeurService,
    private readonly cocktailService: CocktailService,
    private readonly toastCtrl: ToastController,
    private readonly modalCtrl: ModalController,
  ) {
    addIcons({
      addOutline, removeOutline, trashOutline, checkmarkOutline,
      arrowBackOutline, colorWandOutline, searchOutline, filterOutline,
      closeCircleOutline, wineOutline, beerOutline, restaurantOutline,
      optionsOutline, alertCircleOutline, refreshOutline,
    });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.tableId = Number(this.route.snapshot.paramMap.get('tableId'));
    this.charger();
  }

  /** @inheritdoc */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** List of available tables when taking an order. */
  availableTables: TableView[] = [];

  /**
   * Loads the table details (or all available tables if tableId is unspecified) and cocktails in parallel.
   */
  charger(): void {
    this.isLoading = true;
    const tableObs = (this.tableId && !isNaN(this.tableId) && this.tableId > 0)
      ? this.service.getTableById(this.tableId).pipe(map(t => [t]))
      : this.service.getAllTables();

    forkJoin({
      tables: tableObs,
      cocktails: this.cocktailService.getDisponibles(),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)),
      )
      .subscribe({
        next: ({ tables, cocktails }) => {
          this.availableTables = tables;
          if (tables.length > 0) {
            this.table = tables[0];
            this.tableId = tables[0].id;
          }
          this.cocktails = cocktails;
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors du chargement',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /**
   * Updates current active table when selected from the header dropdown.
   * @param targetTableId - Id of the newly selected table.
   */
  onTableSelectChange(targetTableId: number): void {
    const selected = this.availableTables.find(t => t.id === targetTableId);
    if (selected) {
      this.table = selected;
      this.tableId = selected.id;
    }
  }

  /**
   * Returns cocktails filtered by search query, category, and allergen exclusion.
   */
  get filteredCocktails(): Cocktail[] {
    return this.cocktails.filter(cocktail => {
      // Category filter
      if (this.selectedCategory !== 'ALL' && cocktail.categorie !== this.selectedCategory) {
        return false;
      }

      // Search filter
      if (this.searchQuery && this.searchQuery.trim().length > 0) {
        const query = this.searchQuery.toLowerCase().trim();
        const matchesNom = cocktail.nom.toLowerCase().includes(query);
        const matchesCat = cocktail.categorie.toLowerCase().includes(query);
        if (!matchesNom && !matchesCat) {
          return false;
        }
      }

      // Allergen filter (exclude drinks containing selected allergen in ingredient names)
      if (this.selectedAllergen !== 'NONE' && cocktail.ingredients) {
        const allergenKey = this.selectedAllergen.toLowerCase().replaceAll('_', ' ');
        const hasAllergen = cocktail.ingredients.some(ing =>
          ing.ingredientNom?.toLowerCase().includes(allergenKey)
        );
        if (hasAllergen) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sets the active product category filter.
   * @param category - Category key ('ALL', 'ALCOOLISE', etc.)
   */
  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  /**
   * Clears search query and resets category & allergen filters.
   */
  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'ALL';
    this.selectedAllergen = 'NONE';
  }

  /**
   * Opens the variant selection modal for the given cocktail.
   * After confirmation, adds the item to the cart via {@link ajouterDepuisModal}.
   *
   * @param cocktail - The cocktail whose variant modal is to be displayed.
   */
  async ouvrirModal(cocktail: Cocktail): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: VarianteModalComponent,
      componentProps: { cocktail },
      cssClass: 'variante-modal',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<VarianteSelectionResult>();
    if (role === 'confirm' && data) {
      this.ajouterDepuisModal(cocktail, data);
    }
  }

  /**
   * Adds (or increments) a cart item based on the result from the variant modal.
   *
   * @param cocktail - The cocktail being added.
   * @param result - The selection result from {@link VarianteModalComponent}.
   */
  ajouterDepuisModal(cocktail: Cocktail, result: VarianteSelectionResult): void {
    const key = this.buildCartKey(cocktail.id, result.variante?.id, result.notes);
    const existing = this.cart.find(i => i.cartItemKey === key);
    if (existing) {
      existing.quantite++;
    } else {
      this.cart.push({
        cartItemKey: key,
        cocktailId: cocktail.id,
        cocktailNom: cocktail.nom,
        prixUnitaire: result.prixEffectif,
        quantite: 1,
        varianteId: result.variante?.id,
        varianteNom: result.variante?.nom,
        notes: result.notes,
      });
    }
  }

  /**
   * Decrements the quantity of a cart item identified by its unique key.
   * Removes the item from the cart when its quantity reaches zero.
   *
   * @param key - The unique cart item key.
   */
  retirer(key: string): void {
    const idx = this.cart.findIndex(i => i.cartItemKey === key);
    if (idx === -1) return;
    if (this.cart[idx].quantite > 1) {
      this.cart[idx].quantite--;
    } else {
      this.cart.splice(idx, 1);
    }
  }

  /**
   * Increments the quantity of an existing cart item identified by its unique key.
   *
   * @param key - The unique cart item key.
   */
  incrementer(key: string): void {
    const item = this.cart.find(i => i.cartItemKey === key);
    if (item) {
      item.quantite++;
    }
  }

  /**
   * Removes a cart item entirely by its unique key.
   *
   * @param key - The unique cart item key.
   */
  supprimer(key: string): void {
    this.cart = this.cart.filter(i => i.cartItemKey !== key);
  }

  /**
   * Returns the total quantity of a cocktail across all its variants in the cart.
   *
   * @param cocktailId - The cocktail id to look up.
   * @returns Total quantity across all cart lines for that cocktail.
   */
  quantiteDans(cocktailId: number): number {
    return this.cart
      .filter(i => i.cocktailId === cocktailId)
      .reduce((sum, i) => sum + i.quantite, 0);
  }

  /** Total price of all items in the cart (TTC). */
  get totalPanier(): number {
    return this.cart.reduce((sum, i) => sum + i.prixUnitaire * i.quantite, 0);
  }

  /** Subtotal HT (20% VAT rate assumption). */
  get totalHT(): number {
    return this.totalPanier / 1.20;
  }

  /** VAT amount (20% VAT rate assumption). */
  get totalTVA(): number {
    return this.totalPanier - this.totalHT;
  }

  /** Total number of individual drink units in the cart. */
  get nbArticles(): number {
    return this.cart.reduce((sum, i) => sum + i.quantite, 0);
  }

  /**
   * Creates the order and submits all cart items to the API.
   * On success, navigates back to the serveur dashboard.
   */
  valider(): void {
    if (this.cart.length === 0 || this.isSubmitting) return;
    this.isSubmitting = true;

    this.service.createCommande({ tableId: this.tableId })
      .pipe(
        takeUntil(this.destroy$),
        switchMap(commande =>
          forkJoin(
            this.cart.map(item => {
              const req: AjouterItemRequest = {
                cocktailId: item.cocktailId,
                quantite: item.quantite,
                varianteId: item.varianteId,
                notes: item.notes,
              };
              return this.service.ajouterItem(commande.id, req);
            }),
          ).pipe(switchMap(() => of(commande))),
        ),
        finalize(() => (this.isSubmitting = false)),
      )
      .subscribe({
        next: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Commande créée avec succès',
            duration: 2000,
            color: 'success',
          });
          toast.present();
          this.router.navigate(['/serveur']);
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: 'Erreur lors de la création de la commande',
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        },
      });
  }

  /** Track-by function for the cocktails ngFor loop. */
  trackById(_: number, item: Cocktail): number { return item.id; }

  /** Track-by function for the cart ngFor loop. */
  trackByKey(_: number, item: CartItem): string { return item.cartItemKey; }

  /**
   * Builds a unique key for a cart item based on cocktail, variant and notes.
   */
  buildCartKey(cocktailId: number, varianteId: number | undefined, notes: string | undefined): string {
    return `${cocktailId}-${varianteId ?? 'none'}-${notes ?? ''}`;
  }
}
