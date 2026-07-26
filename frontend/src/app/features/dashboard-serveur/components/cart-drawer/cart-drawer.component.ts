import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CartModel, CartItemModel } from '../../models/cart.model';
import { TableView } from '../../models/table-view.model';
import { QuantityStepperComponent } from '../../../../core/components/ui/quantity-stepper/quantity-stepper.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { EmptyStateComponent } from '../../../../core/components/ui/empty-state/empty-state.component';

import { addIcons } from 'ionicons';
import { cartOutline, basketOutline, paperPlaneOutline } from 'ionicons/icons';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QuantityStepperComponent,
    ActionButtonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
})
export class CartDrawerComponent {
  @Input() cart: CartModel = { tableId: null, items: [] };
  @Input() tables: TableView[] = [];
  @Input() isSubmitting = false;

  @Output() quantityChange = new EventEmitter<{ item: CartItemModel; newQty: number }>();
  @Output() removeItem = new EventEmitter<CartItemModel>();
  @Output() tableSelect = new EventEmitter<number>();
  @Output() submitOrder = new EventEmitter<CartModel>();
  @Output() clearCart = new EventEmitter<void>();

  constructor() {
    addIcons({ cartOutline, basketOutline, paperPlaneOutline });
  }

  onQuantityChanged(item: CartItemModel, newQty: number) {
    if (newQty <= 0) {
      this.removeItem.emit(item);
    } else {
      this.quantityChange.emit({ item, newQty });
    }
  }

  onTableChanged(event: any) {
    const val = Number(event.detail?.value);
    if (val) {
      this.tableSelect.emit(val);
    }
  }

  onSubmit() {
    if (this.cart.items.length === 0 || !this.cart.tableId) return;
    this.submitOrder.emit(this.cart);
  }

  get totalTTC(): number {
    return this.cart.items.reduce((acc, curr) => acc + curr.prix * curr.quantite, 0);
  }
}
