import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartDrawerComponent } from '../../../app/features/dashboard-serveur/components/cart-drawer/cart-drawer.component';
import { IonicModule } from '@ionic/angular';
import { CartModel } from '../../../app/features/dashboard-serveur/models/cart.model';

const mockCart: CartModel = {
  tableId: 1,
  items: [
    { boissonId: 101, nom: 'Pinte Blond', prix: 6.0, quantite: 2 },
  ],
};

import { provideIonicAngular } from '@ionic/angular/standalone';

describe('CartDrawerComponent', () => {
  let component: CartDrawerComponent;
  let fixture: ComponentFixture<CartDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartDrawerComponent, getTranslocoTestingModule()],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(CartDrawerComponent);
    component = fixture.componentInstance;
    component.cart = mockCart;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate total TTC correctly', () => {
    expect(component.totalTTC).toBe(12.0);
  });

  it('should emit submitOrder event when valid', () => {
    spyOn(component.submitOrder, 'emit');
    component.onSubmit();
    expect(component.submitOrder.emit).toHaveBeenCalledWith(mockCart);
  });

  it('should not emit submitOrder when items are empty or tableId is null', () => {
    spyOn(component.submitOrder, 'emit');
    component.cart = { tableId: null, items: [] };
    component.onSubmit();
    expect(component.submitOrder.emit).not.toHaveBeenCalled();

    component.cart = { tableId: 1, items: [] };
    component.onSubmit();
    expect(component.submitOrder.emit).not.toHaveBeenCalled();
  });

  it('should emit editCustomization event', () => {
    spyOn(component.editCustomization, 'emit');
    component.onEditItem(mockCart.items[0]);
    expect(component.editCustomization.emit).toHaveBeenCalledWith(mockCart.items[0]);
  });

  it('should emit quantityChange or removeItem on onQuantityChanged', () => {
    spyOn(component.quantityChange, 'emit');
    spyOn(component.removeItem, 'emit');

    component.onQuantityChanged(mockCart.items[0], 3);
    expect(component.quantityChange.emit).toHaveBeenCalledWith({ item: mockCart.items[0], newQty: 3 });

    component.onQuantityChanged(mockCart.items[0], 0);
    expect(component.removeItem.emit).toHaveBeenCalledWith(mockCart.items[0]);
  });

  it('should emit tableSelect on onTableChanged', () => {
    spyOn(component.tableSelect, 'emit');
    component.onTableChanged({ detail: { value: '5' } });
    expect(component.tableSelect.emit).toHaveBeenCalledWith(5);
  });
});
