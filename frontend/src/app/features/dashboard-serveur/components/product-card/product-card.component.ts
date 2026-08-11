import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StockSeverityBadgeComponent } from '../../../../core/components/ui/stock-severity-badge/stock-severity-badge.component';
import { addIcons } from 'ionicons';
import { wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline } from 'ionicons/icons';

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
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, IonicModule, StockSeverityBadgeComponent],
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

  static readonly ALLERGEN_DEFINITIONS = [
    { key: 'LAIT', label: 'Lactose', symbol: '🥛', keywords: ['lait', 'creme', 'crème', 'cream', 'beurre', 'lactose', 'baileys', 'yaourt', 'fromage'] },
    { key: 'GLUTEN', label: 'Gluten', symbol: '🌾', keywords: ['biere', 'bière', 'beer', 'whisky', 'whiskey', 'orge', 'seigle', 'ble', 'blé', 'gluten'] },
    { key: 'OEUF', label: 'Œuf', symbol: '🥚', keywords: ['oeuf', 'œuf', 'egg', 'albumine'] },
    { key: 'FRUITS_A_COQUE', label: 'Noix', symbol: '🥜', keywords: ['amande', 'almond', 'amaretto', 'noisette', 'hazelnut', 'noix', 'walnut', 'pistache', 'pistachio', 'cashew', 'anacarde'] },
    { key: 'ARACHIDE', label: 'Arachide', symbol: '🥜', keywords: ['arachide', 'peanut', 'cacahuete', 'cacahuète'] },
    { key: 'SULFITES', label: 'Sulfites', symbol: '🍷', keywords: ['vin', 'wine', 'champagne', 'prosecco', 'vermouth', 'sulfite', 'sulfites', 'cidre', 'cider', 'aperol', 'campari'] },
    { key: 'SOJA', label: 'Soja', symbol: '🌱', keywords: ['soja', 'soy', 'tofu'] },
  ];

  get detectedAllergens(): { key: string; label: string; symbol: string }[] {
    const ingredientsText = Array.isArray(this.product.ingredients)
      ? this.product.ingredients.map(i => (typeof i === 'object' && i !== null) ? (i.ingredientNom || i.nom || '') : i).join(' ')
      : '';
    const textToSearch = [
      this.product.nom,
      this.product.description || '',
      ingredientsText,
    ].join(' ').toLowerCase();

    return ProductCardComponent.ALLERGEN_DEFINITIONS
      .filter(a => a.keywords.some(kw => textToSearch.includes(kw)))
      .map(a => ({ key: a.key, label: a.label, symbol: a.symbol }));
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
