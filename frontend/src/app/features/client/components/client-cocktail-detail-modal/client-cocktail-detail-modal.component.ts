import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, closeOutline } from 'ionicons/icons';
import { Cocktail } from '../../../../core/models/cocktail.model';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { ModalComponent } from '../../../../core/components/ui/modal/modal.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { environment } from '../../../../../environments/environment';

/**
 * Compact bottom-sheet modal displaying patron-facing cocktail details, flavor tags,
 * glassware composition, and ingredient list strictly without recipe quantities or units.
 */
@Component({
  selector: 'app-client-cocktail-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonModal,
    AppCurrencyPipe,
    ModalComponent,
    ActionButtonComponent
  ],
  templateUrl: './client-cocktail-detail-modal.component.html',
  styleUrls: ['./client-cocktail-detail-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ClientCocktailDetailModalComponent {
  /** Cocktail selected for detail inspection; null keeps modal closed. */
  @Input() cocktail: Cocktail | null = null;

  /** Current item quantity in the guest's collaborative cart. */
  @Input() quantity = 0;

  /** Effective unit price taking Happy Hour rules into account. */
  @Input() effectivePrice = 0;

  /** Whether Happy Hour promotional pricing applies to this cocktail. */
  @Input() isHappyHour = false;

  /** Integer Happy Hour discount percentage if discounted. */
  @Input() discountPercentage: number | null = null;

  /** Emits when the modal is closed via header, footer, backdrop, or hardware back button. */
  @Output() readonly closed = new EventEmitter<void>();

  /** Emits when the guest increments or adds the cocktail to the cart. */
  @Output() readonly addItem = new EventEmitter<Cocktail>();

  /** Emits the cocktail ID when the guest decrements its quantity in the cart. */
  @Output() readonly removeItem = new EventEmitter<number>();

  /** Default glassware image fallback asset. */
  readonly fallbackImageUrl = 'assets/images/verres/verre_tumbler.png';

  constructor() {
    addIcons({ addOutline, removeOutline, closeOutline });
  }

  /**
   * Emits close notification when an active cocktail detail modal is dismissed.
   */
  onClose(): void {
    if (this.cocktail) {
      this.closed.emit();
    }
  }

  /**
   * Emits add event for the currently displayed cocktail.
   */
  onAdd(): void {
    if (this.cocktail) {
      this.addItem.emit(this.cocktail);
    }
  }

  /**
   * Emits remove event for the currently displayed cocktail.
   */
  onRemove(): void {
    if (this.cocktail) {
      this.removeItem.emit(this.cocktail.id);
    }
  }

  /**
   * Resolves relative /uploads/ image paths and falls back to default glassware when empty.
   *
   * @param url Cocktail image URL
   * @returns Resolved image URL
   */
  resolveImageUrl(url?: string): string {
    if (!url) {
      return this.fallbackImageUrl;
    }
    if (url.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${url}`;
    }
    return url;
  }

  /**
   * Replaces failed image elements with the default glassware thumbnail.
   *
   * @param event Image error event
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && !img.src.endsWith(this.fallbackImageUrl)) {
      img.src = this.fallbackImageUrl;
    }
  }

  /**
   * Determines whether the cocktail has primary or companion glassware metadata.
   *
   * @param cocktail Target cocktail
   * @returns True when glassware entries should be rendered
   */
  hasGlassware(cocktail: Cocktail): boolean {
    return Boolean(
      cocktail.glassware ||
      cocktail.secondaryGlassware ||
      (cocktail.glasses && cocktail.glasses.length > 0)
    );
  }

  /**
   * Resolves the theme dot indicator variable for a cocktail category.
   *
   * @param category Category identifier
   * @returns CSS variable expression
   */
  getCategoryDotColor(category: string): string {
    switch (category) {
      case 'ALCOOLISE': return 'var(--types-alcoholic)';
      case 'SANS_ALCOOL': return 'var(--types-nonalcoholic)';
      case 'SHOT': return 'var(--types-shot)';
      case 'APERITIF': return 'var(--semantic-warning)';
      case 'DIGESTIF': return 'var(--semantic-danger)';
      case 'SPECIAL': return 'var(--types-cocktail)';
      default: return 'var(--primary)';
    }
  }

  /**
   * Resolves theme-adaptive style tokens for the category badge.
   *
   * @returns Style map using CSS design variables
   */
  getCategoryPillStyle(): Record<string, string> {
    return {
      'background-color': 'var(--background-surface-2)',
      'border-color': 'var(--border-medium)',
      'color': 'var(--text-primary)'
    };
  }
}
