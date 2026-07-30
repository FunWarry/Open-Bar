import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline } from 'ionicons/icons';

/**
 * Atomic Product Card component conforming to Figma Design System ProductCard (ID 129:95).
 *
 * Displays a cocktail/menu item card with title, description, price badge, and quantity controls.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  /** Product/Cocktail title name. */
  @Input() title!: string;

  /** Description or ingredients snippet. */
  @Input() description?: string;

  /** Price in EUR. */
  @Input() price!: number;

  /** Category badge text (e.g. Alcoolisé, Sans Alcool). */
  @Input() category?: string;

  /** Optional image URL. */
  @Input() imageUrl?: string;

  /** Current selected quantity in cart. */
  @Input() quantity = 0;

  /** Custom data-testid attribute for E2E testing. */
  @Input() testId = 'product-card';

  /** Event emitted when the add/increment button is clicked. */
  @Output() addClick = new EventEmitter<void>();

  /** Event emitted when the remove/decrement button is clicked. */
  @Output() removeClick = new EventEmitter<void>();

  constructor() {
    addIcons({ addOutline, removeOutline });
  }

  onAdd(): void {
    this.addClick.emit();
  }

  onRemove(): void {
    this.removeClick.emit();
  }
}
