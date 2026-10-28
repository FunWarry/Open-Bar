import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCardComponent } from '../../../../app/core/components/ui/product-card/product-card.component';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('ProductCardComponent (Core Design System)', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent, getTranslocoTestingModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.title = 'Pornstar Martini';
    component.price = 12.0;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute companionDescription from companionGlassTitle when set', () => {
    component.companionGlassTitle = 'Shot de Prosecco';
    component.secondaryGlasswareNom = 'Shot';
    expect(component.companionDescription).toBe('Shot de Prosecco');
  });

  it('should fallback companionDescription to secondaryGlasswareNom when companionGlassTitle is empty', () => {
    component.companionGlassTitle = '';
    component.secondaryGlasswareNom = 'Shot';
    expect(component.companionDescription).toBe('Shot');
  });

  it('should return null companionDescription when neither is set', () => {
    component.companionGlassTitle = undefined;
    component.secondaryGlasswareNom = undefined;
    expect(component.companionDescription).toBeNull();
  });

  it('should render companion pill in template when companionDescription is present', () => {
    component.companionGlassTitle = 'Shot de Prosecco';
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('[data-testid="product-card-companion-pill"]');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('Shot de Prosecco');
  });

  it('should compute discountPercentage and render discount badge when under Happy Hour', () => {
    component.price = 9.0;
    component.originalPrice = 12.0;
    component.isHappyHour = true;
    fixture.detectChanges();

    expect(component.discountPercentage).toBe(25);

    const hhBadge = fixture.nativeElement.querySelector('[data-testid="product-card-hh-badge"]');
    expect(hhBadge).toBeTruthy();

    const discountBadge = fixture.nativeElement.querySelector('[data-testid="product-card-discount-badge"]');
    expect(discountBadge).toBeTruthy();
    expect(discountBadge.textContent.trim()).toBe('-25%');

    const originalPriceEl = fixture.nativeElement.querySelector('[data-testid="product-card-original-price"]');
    expect(originalPriceEl).toBeTruthy();
  });
});
