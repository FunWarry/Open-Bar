import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { StockSeverityBadgeComponent } from '../../../../core/components/ui/stock-severity-badge/stock-severity-badge.component';
import { addIcons } from 'ionicons';
import { wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline, addOutline } from 'ionicons/icons';

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
  imports: [CommonModule, IonicModule, ActionButtonComponent, StockSeverityBadgeComponent],
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
    addIcons({ wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline, addOutline });
  }

  get isUnavailable(): boolean {
    return this.product.disponible === false || this.product.stockStatus === 'CRITIQUE';
  }

  get isStockLow(): boolean {
    return this.canSeeLowStock && this.product.stockStatus === 'FAIBLE';
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

  onTouchEnd(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }

  onTouchMove(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
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
