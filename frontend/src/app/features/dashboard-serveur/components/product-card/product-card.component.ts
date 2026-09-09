import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { IonIcon } from '@ionic/angular/standalone';
import { StockSeverityBadgeComponent } from '../../../../core/components/ui/stock-severity-badge/stock-severity-badge.component';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { addIcons } from 'ionicons';
import { wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline } from 'ionicons/icons';
/**
 * Recipe variant option for beverage cards.
 */

import { TranslocoPipe } from '@jsverse/transloco';

export interface ProductVariant {
  id?: number;
  nom: string;
  prix: number;
}

export interface ProductItem {
  id: number;
  nom: string;
  prix: number;
  categorie: string; // 'COCKTAIL' | 'BEER' | 'SOFT' | 'SNACK' | 'SHOT'
  stock?: number;
  stockStatus?: 'CRITIQUE' | 'FAIBLE' | 'NORMAL';
  disponible?: boolean;
  description?: string;
  image?: string;
  ingredients?: any[];
  variantes?: ProductVariant[];
  isHappyHour?: boolean;
  originalPrice?: number | null;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [IonIcon, StockSeverityBadgeComponent, AppCurrencyPipe, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductItem;
  @Input() canSeeLowStock = false;
  @Output() add = new EventEmitter<ProductItem>();
  @Output() customize = new EventEmitter<ProductItem>();

  private longPressTimer?: any;
  private isLongPressTriggered = false;

  constructor() {
    addIcons({ wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline });
  }

  get isUnavailable(): boolean {
    return this.product.disponible === false || this.product.stockStatus === 'CRITIQUE';
  }

  get isStockLow(): boolean {
    return this.canSeeLowStock && this.product.stockStatus === 'FAIBLE';
  }

  static readonly ALLERGEN_DEFINITIONS: readonly { key: string; labelKey: string; symbol: string }[] = [
    { key: 'LAIT', labelKey: 'COCKTAILS.ALLERGENS.LAIT', symbol: '🥛' },
    { key: 'GLUTEN', labelKey: 'COCKTAILS.ALLERGENS.GLUTEN', symbol: '🌾' },
    { key: 'OEUF', labelKey: 'COCKTAILS.ALLERGENS.OEUF', symbol: '🥚' },
    { key: 'FRUITS_A_COQUE', labelKey: 'COCKTAILS.ALLERGENS.FRUITS_A_COQUE', symbol: '🥜' },
    { key: 'ARACHIDE', labelKey: 'COCKTAILS.ALLERGENS.ARACHIDE', symbol: '🥜' },
    { key: 'SULFITES', labelKey: 'COCKTAILS.ALLERGENS.SULFITES', symbol: '🍷' },
    { key: 'SOJA', labelKey: 'COCKTAILS.ALLERGENS.SOJA', symbol: '🌱' },
  ];

  get detectedAllergens(): { key: string; labelKey: string; symbol: string }[] {
    if (!this.product.ingredients || !Array.isArray(this.product.ingredients)) {
      return [];
    }
    const foundAllergens = new Set<string>();
    for (const item of this.product.ingredients) {
      if (typeof item === 'object' && item !== null && 'allergens' in item && Array.isArray((item as any).allergens)) {
        for (const a of (item as any).allergens) {
          foundAllergens.add(a);
        }
      }
    }
    return ProductCardComponent.ALLERGEN_DEFINITIONS
      .filter(a => foundAllergens.has(a.key));
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isUnavailable) {
      this.customize.emit(this.product);
    }
  }

  onTouchStart(event: TouchEvent) {
    if (this.isUnavailable) return;
    this.isLongPressTriggered = false;
    this.longPressTimer = setTimeout(() => {
      this.isLongPressTriggered = true;
      this.customize.emit(this.product);
    }, 500);
  }

  private cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.cancelLongPress();
  }

  onTouchMove(event: TouchEvent) {
    this.cancelLongPress();
  }

  onCardClick() {
    if (this.isLongPressTriggered) {
      this.isLongPressTriggered = false;
      return;
    }
    if (!this.isUnavailable) {
      this.add.emit(this.product);
    }
  }

  onAdd() {
    this.onCardClick();
  }

  get CategoryColor(): string {
    switch (this.product.categorie?.toUpperCase()) {
      case 'COCKTAIL':
      case 'ALCOOLISE': return '#10b981';
      case 'SANS_ALCOOL':
      case 'SOFT': return '#06b6d4';
      case 'SHOT': return '#84cc16';
      case 'APERITIF': return '#f97316';
      case 'DIGESTIF': return '#ef4444';
      case 'SPECIAL': return '#eab308';
      case 'BEER': return '#ffd900';
      case 'SNACK': return '#3b82f6';
      default: return 'var(--primary, #6c7fe8)';
    }
  }

  get CategoryIcon(): string {
    switch (this.product.categorie?.toUpperCase()) {
      case 'COCKTAIL':
      case 'ALCOOLISE':
      case 'APERITIF': return 'wine-outline';
      case 'SANS_ALCOOL':
      case 'SOFT': return 'water-outline';
      case 'SHOT':
      case 'DIGESTIF': return 'flame-outline';
      case 'BEER': return 'beer-outline';
      case 'SNACK': return 'fast-food-outline';
      default: return 'wine-outline';
    }
  }
}
