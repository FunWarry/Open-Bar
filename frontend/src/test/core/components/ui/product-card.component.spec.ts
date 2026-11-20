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

  it('should render compact mode with fallback thumbnail, category dot, and streamlined controls', () => {
    component.compact = true;
    component.category = 'ALCOOLISE';
    component.description = 'Rich citrus cocktail';
    component.flavorProfiles = ['FRUITY'];
    component.isVegan = true;
    component.price = 8.0;
    component.originalPrice = 10.0;
    component.isHappyHour = true;
    component.quantity = 2;
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('[data-testid="product-card"]') as HTMLElement;
    expect(container.classList.contains('compact')).toBeTrue();
    expect(container.getAttribute('data-view-mode')).toBe('compact');

    const img = fixture.nativeElement.querySelector('.product-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(component.fallbackImageUrl);

    const categoryDot = fixture.nativeElement.querySelector('[data-testid="product-compact-category-dot"]');
    const discountBadge = fixture.nativeElement.querySelector('[data-testid="product-card-discount-badge"]');
    const qtyEl = fixture.nativeElement.querySelector('[data-testid="product-card-qty"]');
    expect(categoryDot).toBeTruthy();
    expect(discountBadge?.textContent?.trim()).toBe('-20%');
    expect(qtyEl?.textContent?.trim()).toBe('2');

    expect(fixture.nativeElement.querySelector('.product-desc')).toBeNull();
    expect(fixture.nativeElement.querySelector('.product-flavors-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('.product-dietary-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="product-card-info-btn"]')).toBeNull();
  });

  it('should emit addClick, removeClick, and cardClick appropriately and handle image error fallback', () => {
    spyOn(component.addClick, 'emit');
    spyOn(component.removeClick, 'emit');
    spyOn(component.cardClick, 'emit');

    component.compact = true;
    component.quantity = 1;
    fixture.detectChanges();

    const plusBtn = fixture.nativeElement.querySelector('[data-testid="product-card-plus"]') as HTMLButtonElement;
    const minusBtn = fixture.nativeElement.querySelector('[data-testid="product-card-minus"]') as HTMLButtonElement;
    const container = fixture.nativeElement.querySelector('[data-testid="product-card"]') as HTMLElement;

    plusBtn.click();
    expect(component.addClick.emit).toHaveBeenCalledTimes(1);
    expect(component.cardClick.emit).not.toHaveBeenCalled();

    minusBtn.click();
    expect(component.removeClick.emit).toHaveBeenCalledTimes(1);
    expect(component.cardClick.emit).not.toHaveBeenCalled();

    container.click();
    expect(component.cardClick.emit).toHaveBeenCalledTimes(1);

    component.onCardClick(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(component.cardClick.emit).toHaveBeenCalledTimes(1);

    component.onCardClick(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.cardClick.emit).toHaveBeenCalledTimes(2);

    const img = document.createElement('img');
    img.src = 'https://invalid.local/missing.png';
    component.onImageError({ target: img } as unknown as Event);
    expect(img.src).toContain(component.fallbackImageUrl);
  });
});
