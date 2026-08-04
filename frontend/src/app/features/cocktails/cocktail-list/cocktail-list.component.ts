import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { selectIsAdmin } from '../../../core/store/auth.selectors';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  IonSpinner, ToastController, IonThumbnail, IonSearchbar,
  IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, leafOutline, toggleOutline, gridOutline, listOutline, search, imageOutline, image } from 'ionicons/icons';
import { AsyncPipe, CurrencyPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CocktailService } from '../../../core/services/cocktail.service';
import { Cocktail } from '../../../core/models/cocktail.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * Global Cocktails Management component in OpenBar (Figma styled).
 * Features card grid with picture toggle, category pill badges, ingredient subtitles,
 * search query filters, status filtering (Available/Unavailable), and CRUD actions.
 */
@Component({
  selector: 'app-cocktail-list',
  templateUrl: './cocktail-list.component.html',
  styleUrls: ['./cocktail-list.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, AsyncPipe, CurrencyPipe, TranslocoModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
    IonSpinner, IonThumbnail, IonSearchbar, IonGrid, IonRow, IonCol,
  ],
})
export class CocktailListComponent implements OnInit, OnDestroy {
  private readonly PICTURES_CACHE_KEY = 'openbar_show_pictures';

  cocktails: Cocktail[] = [];
  filtre: 'tous' | 'disponibles' | 'indisponibles' = 'tous';
  selectedCategory = 'ALL';
  searchQuery = '';
  viewMode: 'grid' | 'list' = 'grid';
  showPictures = localStorage.getItem('openbar_show_pictures') !== 'false';

  isLoading = false;
  isAdmin$: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly cocktailService: CocktailService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({ add, create, trash, leafOutline, toggleOutline, gridOutline, listOutline, search, imageOutline, image });
  }

  ngOnInit(): void {
    this.charger();
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
   * Returns filtered cocktails array based on search query, category, and availability status filters.
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

      return matchesSearch && matchesCategory && matchesStatus;
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
      'background-color': `${color}26`,
      'border-color': `${color}70`,
      'color': '#ffffff'
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
}
