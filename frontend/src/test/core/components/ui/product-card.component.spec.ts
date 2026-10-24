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
});
