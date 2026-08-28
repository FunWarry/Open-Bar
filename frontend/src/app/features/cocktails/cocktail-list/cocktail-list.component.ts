import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent,
  IonSpinner, ToastController, IonThumbnail,
  IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, create, trash, leafOutline, toggle, toggleOutline, gridOutline, listOutline,
  search, imageOutline, image, wineOutline, nutritionOutline, eggOutline,
  funnelOutline, closeCircleOutline, alertCircleOutline
} from 'ionicons/icons';
import { AsyncPipe, CurrencyPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CocktailService } from '../../../core/services/cocktail.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';
import { environment } from '../../../../environments/environment';

/**
 * Interface representing an allergen option for filtering.
 */
export interface AllergenOption {
  key: string;
  labelKey: string;
  icon: string;
  keywords: string[];
}

/**
 * Global Cocktails Management component in OpenBar (Figma styled).
 * Features card grid with picture toggle, category pill badges, ingredient subtitles,
 * search query filters, allergen exclusion filtering, status filtering (Available/Unavailable), and CRUD actions.
 */
@Component({
  selector: 'app-cocktail-list',
  templateUrl: './cocktail-list.component.html',
  styleUrls: ['./cocktail-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, AsyncPipe, CurrencyPipe, TranslocoModule,
    IonContent, IonCard, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent,
    IonSpinner, IonThumbnail, IonGrid, IonRow, IonCol,
  ],
})
export class CocktailListComponent implements OnInit, OnDestroy {
  private readonly PICTURES_CACHE_KEY = 'openbar_show_pictures';

  cocktails: Cocktail[] = [];
  filtre: 'tous' | 'disponibles' | 'indisponibles' = 'tous';
  selectedCategory = 'ALL';
  selectedAllergens: string[] = [];
  searchQuery = '';
  viewMode: 'grid' | 'list' = 'grid';
  showPictures = localStorage.getItem('openbar_show_pictures') !== 'false';

  readonly availableAllergens: AllergenOption[] = [
    { key: 'LAIT', labelKey: 'COCKTAILS.ALLERGENS.LAIT', icon: 'nutrition-outline', keywords: ['lait', 'creme', 'crème', 'cream', 'beurre', 'lactose', 'baileys', 'yaourt', 'fromage'] },
    { key: 'GLUTEN', labelKey: 'COCKTAILS.ALLERGENS.GLUTEN', icon: 'leaf-outline', keywords: ['biere', 'bière', 'beer', 'whisky', 'whiskey', 'orge', 'seigle', 'ble', 'blé', 'gluten'] },
    { key: 'OEUF', labelKey: 'COCKTAILS.ALLERGENS.OEUF', icon: 'egg-outline', keywords: ['oeuf', 'œuf', 'egg', 'albumine'] },
    { key: 'FRUITS_A_COQUE', labelKey: 'COCKTAILS.ALLERGENS.FRUITS_A_COQUE', icon: 'nutrition-outline', keywords: ['amande', 'almond', 'amaretto', 'noisette', 'hazelnut', 'noix', 'walnut', 'pistache', 'pistachio', 'cashew', 'anacarde'] },
    { key: 'ARACHIDE', labelKey: 'COCKTAILS.ALLERGENS.ARACHIDE', icon: 'nutrition-outline', keywords: ['arachide', 'peanut', 'cacahuete', 'cacahuète'] },
    { key: 'SULFITES', labelKey: 'COCKTAILS.ALLERGENS.SULFITES', icon: 'wine-outline', keywords: ['vin', 'wine', 'champagne', 'prosecco', 'vermouth', 'sulfite', 'sulfites', 'cidre', 'cider', 'aperol', 'campari'] },
    { key: 'SOJA', labelKey: 'COCKTAILS.ALLERGENS.SOJA', icon: 'leaf-outline', keywords: ['soja', 'soy', 'tofu'] },
  ];

  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly cocktailService: CocktailService,
    private readonly webSocketService: WebSocketService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({
      add, create, trash, leafOutline, toggle, toggleOutline, gridOutline, listOutline,
      search, imageOutline, image, wineOutline, nutritionOutline, eggOutline,
      funnelOutline, closeCircleOutline, alertCircleOutline
    });
  }

  ngOnInit(): void {
    this.charger();
    this.initWebSocketSubscription();
  }

  /**
   * Subscribes to live WebSocket topics for real-time synchronization
   * across multiple connected users without reloading the entire page.
   */
  private initWebSocketSubscription(): void {
    // 1. Live cocktail updates & additions in-place
    this.webSocketService.watch('/topic/cocktails')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg) => {
          try {
            const updatedCocktail: Cocktail = JSON.parse(msg.body);
            if (updatedCocktail?.id) {
              const idx = this.cocktails.findIndex(c => c.id === updatedCocktail.id);
              if (idx !== -1) {
                // Update in-place to avoid layout jump / spinner / resetting filters
                this.cocktails[idx] = updatedCocktail;
                this.cocktails = [...this.cocktails];
              } else {
                // Prepend new cocktail created by another user
                this.cocktails = [updatedCocktail, ...this.cocktails];
              }
            }
          } catch {
            // Ignore malformed payload
          }
        },
      });

    // 2. Live cocktail deletions in-place
    this.webSocketService.watch('/topic/cocktails/supprime')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            if (payload?.id) {
              this.cocktails = this.cocktails.filter(c => c.id !== payload.id);
            }
          } catch {
            // Ignore malformed payload
          }
        },
      });
  }

  /**
   * Toggles picture display and saves preference to localStorage.
   */
  togglePictures(): void {
    this.showPictures = !this.showPictures;
    localStorage.setItem(this.PICTURES_CACHE_KEY, String(this.showPictures));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Displays toast notification.
   * @param messageKey Translation key or plain text
   * @param color Toast color theme
   * @param duration Toast duration in ms
   */
  private async showToast(messageKey: string, color: 'success' | 'danger' = 'success', duration = 3000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.transloco.translate(messageKey),
      duration,
      color
    });
    await toast.present();
  }

  /**
   * Fetches all cocktails from backend API.
   * @param refreshEvent Optional IonRefresher event for pull-to-refresh
   */
  charger(refreshEvent?: any): void {
    this.isLoading = true;
    this.cocktailService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        }),
      )
      .subscribe({
        next: cocktails => {
          this.cocktails = cocktails;
        },
        error: () => this.showToast('COMMON.ERROR', 'danger'),
      });
  }

  /**
   * Detects list of allergen keys present in a cocktail based on ingredient names, description, and instructions.
   * @param cocktail Target cocktail model
   * @returns List of matching allergen keys
   */
  getCocktailAllergens(cocktail: Cocktail): string[] {
    if (!cocktail) return [];
    const textToSearch = [
      cocktail.nom,
      cocktail.description || '',
      cocktail.instructions || '',
      ...(cocktail.ingredients ? cocktail.ingredients.map(i => i.ingredientNom) : [])
    ].join(' ').toLowerCase();

    return this.availableAllergens
      .filter(allergen => allergen.keywords.some(kw => textToSearch.includes(kw)))
      .map(allergen => allergen.key);
  }

  /**
   * Toggles allergen exclusion filter state.
   * @param allergenKey Allergen key to toggle
   */
  toggleAllergenFilter(allergenKey: string): void {
    const idx = this.selectedAllergens.indexOf(allergenKey);
    if (idx >= 0) {
      this.selectedAllergens.splice(idx, 1);
    } else {
      this.selectedAllergens.push(allergenKey);
    }
  }

  /**
   * Clears all active allergen exclusion filters.
   */
  clearAllergenFilters(): void {
    this.selectedAllergens = [];
  }

  /**
   * Returns filtered cocktails array based on search query, category, allergen exclusion, and availability status filters.
   */
  get filteredCocktails(): Cocktail[] {
    const query = this.searchQuery.toLowerCase().trim();
    return this.cocktails.filter(c => {
      const matchesSearch = !query ||
        c.nom.toLowerCase().includes(query) ||
        (c.description?.toLowerCase()?.includes(query) ?? false);

      const matchesCategory = this.selectedCategory === 'ALL' || c.categorie === this.selectedCategory;

      let matchesStatus = true;
      if (this.filtre === 'disponibles') matchesStatus = c.disponible;
      else if (this.filtre === 'indisponibles') matchesStatus = !c.disponible;

      let matchesAllergens = true;
      if (this.selectedAllergens.length > 0) {
        const cocktailAllergens = this.getCocktailAllergens(c);
        matchesAllergens = !this.selectedAllergens.some(a => cocktailAllergens.includes(a));
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesAllergens;
    });
  }

  isHorsSaison(cocktail: Cocktail): boolean {
    return !!(cocktail.moisDebut && cocktail.moisFin && cocktail.disponibleAujourdhui === false);
  }

  /**
   * Formats ingredients list as a dot-separated string for card subtitle (Figma design).
   * @param cocktail Target cocktail model
   */
  getIngredientsText(cocktail: Cocktail): string {
    if (cocktail.ingredients && cocktail.ingredients.length > 0) {
      return cocktail.ingredients.map(i => i.ingredientNom).join(' · ');
    }
    return cocktail.description || '';
  }

  /**
   * Resolves category badge dot indicator color for Figma-style pill badges.
   * @param category Category name
   */
  getCategoryDotColor(category: string): string {
    switch (category) {
      case 'ALCOOLISE': return '#10b981'; // Green
      case 'SANS_ALCOOL': return '#06b6d4'; // Cyan
      case 'SHOT': return '#84cc16'; // Lime
      case 'APERITIF': return '#f97316'; // Orange
      case 'DIGESTIF': return '#ef4444'; // Red
      case 'SPECIAL': return '#eab308'; // Yellow
      default: return '#6366f1'; // Indigo
    }
  }

  /**
   * Resolves dynamic background, border, and text styles with transparency levels for category badges (Figma specs).
   * @param category Category name
   * @param isActive Active state flag
   */
  getCategoryPillStyle(category: string, isActive = false): Record<string, string> {
    const color = this.getCategoryDotColor(category);
    if (isActive) {
      return {
        'background-color': color,
        'border-color': color,
        'color': '#ffffff',
        'box-shadow': `0 4px 14px ${color}66`
      };
    }
    return {
      'background-color': 'var(--background-surface-2)',
      'border-color': 'var(--border-medium)',
      'color': 'var(--text-primary)'
    };
  }

  onToggleDisponibilite(cocktail: Cocktail): void {
    this.cocktailService.toggleDisponibilite(cocktail.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const idx = this.cocktails.findIndex(c => c.id === updated.id);
          if (idx !== -1) this.cocktails[idx] = updated;
        },
        error: () => this.showToast('COMMON.ERROR', 'danger'),
      });
  }

  onDelete(cocktail: Cocktail): void {
    this.cocktailService.delete(cocktail.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.cocktails = this.cocktails.filter(c => c.id !== cocktail.id);
          await this.showToast('COMMON.SUCCESS', 'success', 2000);
        },
        error: () => this.showToast('COMMON.ERROR', 'danger'),
      });
  }

  onAdd(): void { this.router.navigate(['/cocktails/new']); }
  onEdit(c: Cocktail): void { this.router.navigate(['/cocktails', c.id, 'edit']); }
  onRefresh(event: any): void { this.charger(event); }
  trackById(_: number, item: Cocktail): number { return item.id; }

  /**
   * Returns a valid image URL for the cocktail, falling back to a glass asset
   * if the URL is empty or points to a legacy nonexistent path.
   */
  getCocktailImage(cocktail: Cocktail): string {
    if (!cocktail.imageUrl || cocktail.imageUrl.includes('assets/images/cocktails/')) {
      return 'assets/images/verres/verre_tumbler.png';
    }
    if (cocktail.imageUrl.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${cocktail.imageUrl}`;
    }
    return cocktail.imageUrl;
  }
}
