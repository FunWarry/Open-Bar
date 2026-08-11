import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { StockSeverityBadgeComponent } from '../../../../core/components/ui/stock-severity-badge/stock-severity-badge.component';
import { addIcons } from 'ionicons';
import { wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline, addOutline } from 'ionicons/icons';

export interface ProductItem {
  id: number;
  nom: string;
  prix: number;
  categorie: string; // 'COCKTAIL' | 'BEER' | 'SOFT' | 'SNACK' | 'SHOT'
  stock?: number;
  stockStatus?: 'CRITIQUE' | 'FAIBLE' | 'NORMAL';
  description?: string;
  image?: string;
  ingredients?: any[];
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
  @Output() add = new EventEmitter<ProductItem>();

  constructor() {
    addIcons({ wineOutline, beerOutline, waterOutline, flameOutline, fastFoodOutline, addOutline });
  }

  onAdd() {
    this.add.emit(this.product);
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
