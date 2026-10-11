import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { CartModel, CartItemModel } from '../../models/cart.model';
import { TableView } from '../../models/table-view.model';
import { QuantityStepperComponent } from '../../../../core/components/ui/quantity-stepper/quantity-stepper.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { EmptyStateComponent } from '../../../../core/components/ui/empty-state/empty-state.component';
import { SearchableSelectComponent, SearchableOption } from '../../../../core/components/ui/searchable-select/searchable-select.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';

import { addIcons } from 'ionicons';
import { cartOutline, basketOutline, paperPlaneOutline, chatbubbleEllipsesOutline, createOutline, receiptOutline, chevronForwardOutline } from 'ionicons/icons';

/**
 * Drawer modal presenting current order cart lines during server order taking.
 */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [
    FormsModule,
    IonIcon,
    SearchableSelectComponent,
    QuantityStepperComponent,
    ActionButtonComponent,
    EmptyStateComponent,
    TranslocoPipe,
    AppCurrencyPipe
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
})
export class CartDrawerComponent {
  @Input() cart: CartModel = { tableId: null, items: [] };
  @Input() tables: TableView[] = [];
  @Input() isSubmitting = false;
  @Input() canCollapse = false;

  @Output() quantityChange = new EventEmitter<{ item: CartItemModel; newQty: number }>();
  @Output() removeItem = new EventEmitter<CartItemModel>();
  @Output() tableSelect = new EventEmitter<number>();
  @Output() submitOrder = new EventEmitter<CartModel>();
  @Output() clearCart = new EventEmitter<void>();
  @Output() editCustomization = new EventEmitter<CartItemModel>();
  @Output() collapseCart = new EventEmitter<void>();

  constructor() {
    addIcons({ cartOutline, basketOutline, paperPlaneOutline, chatbubbleEllipsesOutline, createOutline, receiptOutline, chevronForwardOutline });
  }

  onEditItem(item: CartItemModel) {
    this.editCustomization.emit(item);
  }

  onQuantityChanged(item: CartItemModel, newQty: number) {
    if (newQty <= 0) {
      this.removeItem.emit(item);
    } else {
      this.quantityChange.emit({ item, newQty });
    }
  }

  get tableOptions(): SearchableOption<number>[] {
    return this.tables.map(t => ({
      value: t.id,
      label: t.nom,
      subLabel: t.zone || undefined,
    }));
  }

  onTableSelectChange(option: SearchableOption<any> | number | null) {
    const val = typeof option === 'object' && option !== null ? option.value : option;
    if (val) {
      this.tableSelect.emit(Number(val));
    }
  }

  onTableChanged(event: { detail?: { value?: string | number } }) {
    const val = Number(event.detail?.value);
    if (val) {
      this.tableSelect.emit(val);
    }
  }

  onSubmit() {
    if (this.cart.items.length === 0 || (!this.cart.tableId && !this.cart.barTabId)) return;
    this.submitOrder.emit(this.cart);
  }

  get totalTTC(): number {
    return this.cart.items.reduce((acc, curr) => acc + curr.prix * curr.quantite, 0);
  }
}
