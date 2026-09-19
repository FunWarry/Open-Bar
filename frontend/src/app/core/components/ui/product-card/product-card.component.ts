import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, informationCircleOutline } from 'ionicons/icons';
import { environment } from '../../../../../environments/environment';

/**
 * Atomic Product Card component conforming to Figma Design System ProductCard (ID 129:95).
 *
 * Displays a cocktail/menu item card with title, description, price badge, quantity controls,
 * visual flavor profile badges, and dietary indicators.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, TranslocoModule, IonIcon],
  templateUrl: './product-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  /** Product/Cocktail title name. */
  @Input() title!: string;

  /** Description or ingredients snippet. */
  @Input() description?: string;

  /** Price in EUR. */
  @Input() price!: number;

  /** Whether the product currently has an active promotional Happy Hour discount. */
  @Input() isHappyHour = false;

  /** Non-discounted original catalog price in EUR. */
  @Input() originalPrice?: number | null;

  /** Category badge text (e.g. Alcoholic, Non-Alcoholic). */
  @Input() category?: string;

  /** Optional image URL. */
  @Input() imageUrl?: string;

  /** Current selected quantity in cart. */
  @Input() quantity = 0;

  /** Custom data-testid attribute for E2E testing. */
  @Input() testId = 'product-card';

  /** Flavor profile tags (FRUITY, SMOKY, etc.). */
  @Input() flavorProfiles?: string[] = [];

  /** Alcohol by volume percentage. */
  @Input() alcoholLevel?: number | null;

  /** Whether the cocktail is non-alcoholic mocktail. */
  @Input() isMocktail = false;

  /** Whether the cocktail is vegan friendly. */
  @Input() isVegan = false;

  /** Whether the cocktail is gluten-free. */
  @Input() isGlutenFree = false;

  /** Event emitted when the add/increment button is clicked. */
  @Output() addClick = new EventEmitter<void>();

  /** Event emitted when the remove/decrement button is clicked. */
  @Output() removeClick = new EventEmitter<void>();

  /** Event emitted when the card is clicked to inspect cocktail details / ingredients. */
  @Output() cardClick = new EventEmitter<void>();

  constructor() {
    addIcons({ addOutline, removeOutline, informationCircleOutline });
  }

  onAdd(event?: Event): void {
    event?.stopPropagation();
    this.addClick.emit();
  }

  onRemove(event?: Event): void {
    event?.stopPropagation();
    this.removeClick.emit();
  }

  /**
   * Handles click or keyboard activation on the card container to view cocktail ingredients.
   *
   * @param event Optional triggering event
   */
  onCardClick(event?: Event): void {
    this.cardClick.emit();
  }

  /**
   * Resolves relative image paths to the backend host when starting with /uploads/.
   *
   * @param url Image URL or relative path
   * @returns Fully qualified or untouched URL
   */
  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${url}`;
    }
    return url;
  }

  /**
   * Resolves category badge dot indicator color for Figma-style pill badges.
   *
   * @param category Category identifier
   * @returns Hex color string for the indicator dot
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
   * Resolves dynamic background, border, and text styles for category badge.
   *
   * @param category Category identifier
   * @returns Style object with CSS variable bindings
   */
  getCategoryPillStyle(category: string): Record<string, string> {
    return {
      'background-color': 'var(--background-surface-2)',
      'border': '1px solid var(--border-medium)',
      'color': 'var(--text-primary)'
    };
  }
}
