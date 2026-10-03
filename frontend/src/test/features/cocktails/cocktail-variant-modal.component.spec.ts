import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import {
  CocktailVariantModalComponent,
  CocktailVariantModalResult
} from '../../../app/features/cocktails/components/cocktail-variant-modal/cocktail-variant-modal.component';
import { Cocktail, CocktailVariante } from '../../../app/core/models/cocktail.model';

describe('CocktailVariantModalComponent', () => {
  let component: CocktailVariantModalComponent;
  let fixture: ComponentFixture<CocktailVariantModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockVariant1: CocktailVariante = {
    id: 101,
    cocktailId: 1,
    nom: 'Virgin Mule',
    description: 'Non-alcoholic version with spicy ginger beer',
    prixSupplement: 0.0,
    disponible: true,
    instructions: 'Build over crushed ice in copper mug.',
    recipeSteps: []
  };

  const mockVariant2: CocktailVariante = {
    id: 102,
    cocktailId: 1,
    nom: 'London Mule',
    description: 'Gin twist on the classic mule',
    prixSupplement: 1.5,
    disponible: true,
    instructions: 'Combine gin and ginger beer over ice.',
    recipeSteps: []
  };

  const mockCocktail: Cocktail = {
    id: 1,
    nom: 'Moscow Mule',
    description: 'Classic vodka and ginger beer highball',
    prix: 10.0,
    categorie: 'ALCOOLISE',
    disponible: true,
    saisonnier: false,
    isMocktail: false,
    isVegan: true,
    isGlutenFree: true,
    alcoholLevel: 11.5,
    ingredients: [],
    recipeSteps: [],
    variantes: [mockVariant1, mockVariant2],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [CocktailVariantModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailVariantModalComponent);
    component = fixture.componentInstance;
    component.cocktail = { ...mockCocktail, variantes: [mockVariant1, mockVariant2] };
    component.filteredVariants = [mockVariant1];
    component.activeFilterSummary = 'Sans alcool';
    fixture.detectChanges();
  });

  it('should create the variant modal component', () => {
    expect(component).toBeTruthy();
  });

  describe('Filtering Behavior', () => {
    it('should display only filtered variants when activeFilterSummary is set and showAllVariants is false', () => {
      expect(component.displayedVariants).toHaveSize(1);
      expect(component.displayedVariants[0].nom).toBe('Virgin Mule');
      expect(component.hiddenVariantsCount).toBe(1);
    });

    it('should display all variants when activeFilterSummary is empty', () => {
      component.activeFilterSummary = '';
      expect(component.displayedVariants).toHaveSize(2);
      expect(component.hiddenVariantsCount).toBe(1);
    });

    it('should toggle showAllVariants and reveal all available variants', () => {
      expect(component.showAllVariants).toBeFalse();
      expect(component.displayedVariants).toHaveSize(1);

      component.toggleShowAll();
      expect(component.showAllVariants).toBeTrue();
      expect(component.displayedVariants).toHaveSize(2);

      component.toggleShowAll();
      expect(component.showAllVariants).toBeFalse();
      expect(component.displayedVariants).toHaveSize(1);
    });
  });

  describe('Modal Actions', () => {
    it('should dismiss with cancel role when dismiss is called', () => {
      component.dismiss();
      expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });

    it('should dismiss with null variant payload when standard recipe is selected', () => {
      component.selectOption(null);
      const expectedPayload: CocktailVariantModalResult = {
        selectedVariant: null,
        confirmed: true
      };
      expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(expectedPayload, 'confirm');
    });

    it('should dismiss with selected variant payload when variant option is picked', () => {
      component.selectOption(mockVariant1);
      const expectedPayload: CocktailVariantModalResult = {
        selectedVariant: mockVariant1,
        confirmed: true
      };
      expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(expectedPayload, 'confirm');
    });
  });

  describe('Price and Supplement Helpers', () => {
    it('should calculate base price when variant is null', () => {
      expect(component.getEffectivePrice(null)).toBe(10.0);
    });

    it('should add price supplement to base price when variant has supplement', () => {
      expect(component.getEffectivePrice(mockVariant2)).toBe(11.5);
    });

    it('should format supplement label with + sign when price supplement is positive', () => {
      const label = component.getSupplementLabel(mockVariant2);
      expect(label).toBe('+1.50 €');
    });

    it('should format standard price translation when supplement is 0 or null', () => {
      const label = component.getSupplementLabel(mockVariant1);
      expect(label).toBeTruthy();
    });
  });
});
