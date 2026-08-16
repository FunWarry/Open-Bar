import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemCustomizationModalComponent } from '../../../app/features/dashboard-serveur/components/item-customization-modal/item-customization-modal.component';
import { ModalController } from '@ionic/angular/standalone';
import { ProductItem } from '../../../app/features/dashboard-serveur/components/product-card/product-card.component';

describe('ItemCustomizationModalComponent', () => {
  let component: ItemCustomizationModalComponent;
  let fixture: ComponentFixture<ItemCustomizationModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockProduct: ProductItem = {
    id: 1,
    nom: 'Mojito',
    prix: 8.5,
    categorie: 'Cocktail',
    disponible: true,
    ingredients: ['Menthe', 'Rhum', 'Sucre', 'Citron vert'],
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [ItemCustomizationModalComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemCustomizationModalComponent);
    component = fixture.componentInstance;
    component.product = mockProduct;
    fixture.detectChanges();
  });

  it('should create and initialize values', () => {
    expect(component).toBeTruthy();
    expect(component.ingredientsList).toEqual(['Menthe', 'Rhum', 'Sucre', 'Citron vert']);
  });

  it('should parse ingredients from description if ingredients array is empty', () => {
    component.product = {
      id: 2,
      nom: 'Gin Tonic',
      prix: 9.0,
      categorie: 'Cocktail',
      disponible: true,
      description: 'Gin, Tonic, Concombre',
    };

    expect(component.ingredientsList).toEqual(['Gin', 'Tonic', 'Concombre']);
  });

  it('should toggle ingredient exclusion', () => {
    expect(component.excludedIngredients).toHaveSize(0);

    component.toggleIngredientExclusion('Menthe');
    expect(component.excludedIngredients).toEqual(['Menthe']);

    component.toggleIngredientExclusion('Menthe');
    expect(component.excludedIngredients).toHaveSize(0);
  });

  it('should toggle quick notes in comment field', () => {
    expect(component.hasQuickNote('Sans glaçons')).toBeFalse();

    component.toggleQuickNote('Sans glaçons');
    expect(component.hasQuickNote('Sans glaçons')).toBeTrue();
    expect(component.commentaire).toContain('Sans glaçons');

    component.toggleQuickNote('Sans glaçons');
    expect(component.hasQuickNote('Sans glaçons')).toBeFalse();
  });

  it('should dismiss with cancel on close', () => {
    component.close();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should dismiss with confirm and data on save', () => {
    component.commentaire = '  Extra lime  ';
    component.excludedIngredients = ['Sucre'];

    component.save();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      commentaire: 'Extra lime',
      exclusions: ['Sucre'],
    }, 'confirm');
  });
});
