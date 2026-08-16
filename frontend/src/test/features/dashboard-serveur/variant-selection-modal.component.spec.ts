import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VariantSelectionModalComponent } from '../../../app/features/dashboard-serveur/components/variant-selection-modal/variant-selection-modal.component';
import { ModalController } from '@ionic/angular/standalone';
import { ProductItem, ProductVariant } from '../../../app/features/dashboard-serveur/components/product-card/product-card.component';

describe('VariantSelectionModalComponent', () => {
  let component: VariantSelectionModalComponent;
  let fixture: ComponentFixture<VariantSelectionModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockVariant: ProductVariant = {
    id: 10,
    nom: 'Sans Alcool',
    prix: 6.5,
  };

  const mockProduct: ProductItem = {
    id: 1,
    nom: 'Mojito',
    prix: 8.5,
    categorie: 'Cocktail',
    disponible: true,
    variantes: [mockVariant],
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [VariantSelectionModalComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VariantSelectionModalComponent);
    component = fixture.componentInstance;
    component.product = mockProduct;
    fixture.detectChanges();
  });

  it('should create and render product variants', () => {
    expect(component).toBeTruthy();
    expect(component.product.variantes?.length).toBe(1);
  });

  it('should dismiss with cancel on close', () => {
    component.close();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should dismiss with selected variant on selectVariant', () => {
    component.selectVariant(mockVariant);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ selectedVariant: mockVariant }, 'confirm');
  });
});
