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
      case 'COCKTAIL': return 'var(--types-cocktail, #ff8800)';
      case 'BEER': return 'var(--types-beer, #ffd900)';
      case 'SOFT': return 'var(--types-nonalcoholic, #00aaff)';
      case 'SHOT': return 'var(--types-shot, #d9ff00)';
      case 'SNACK': return 'var(--types-snacks, #0051ff)';
      default: return 'var(--primary, #6c7fe8)';
    }
  }

  get CategoryIcon(): string {
    switch (this.product.categorie?.toUpperCase()) {
      case 'COCKTAIL': return 'wine-outline';
      case 'BEER': return 'beer-outline';
      case 'SOFT': return 'water-outline';
      case 'SHOT': return 'flame-outline';
      case 'SNACK': return 'fast-food-outline';
      default: return 'drink-outline';
    }
  }
}
