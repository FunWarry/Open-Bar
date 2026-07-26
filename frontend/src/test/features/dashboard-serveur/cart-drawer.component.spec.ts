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
      imports: [CartDrawerComponent],
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

  it('should emit submitOrder event', () => {
    spyOn(component.submitOrder, 'emit');
    component.onSubmit();
    expect(component.submitOrder.emit).toHaveBeenCalledWith(mockCart);
  });
});
