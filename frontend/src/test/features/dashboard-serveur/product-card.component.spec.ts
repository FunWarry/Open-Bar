import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCardComponent, ProductItem } from '../../../app/features/dashboard-serveur/components/product-card/product-card.component';
import { provideIonicAngular } from '@ionic/angular/standalone';

const mockProduct: ProductItem = {
  id: 1,
  nom: 'Mojito',
  prix: 8.5,
  categorie: 'COCKTAIL',
  stock: 12,
  stockStatus: 'NORMAL',
  description: 'Rhum, menthe, citron',
};

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent, getTranslocoTestingModule()],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = mockProduct;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should display product name and price', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mojito');
    expect(compiled.textContent).toMatch(/8[,.]50/);
    expect(compiled.textContent).toContain('€');
  });

  it('should emit add event on click', () => {
    spyOn(component.add, 'emit');
    component.onAdd();
    expect(component.add.emit).toHaveBeenCalledWith(mockProduct);
  });
});
