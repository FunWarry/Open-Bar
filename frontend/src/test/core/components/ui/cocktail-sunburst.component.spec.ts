import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CocktailSunburstComponent,
  SunburstIngredientInput,
  classifyIngredientFamily,
  normalizeToMl
} from '../../../../app/core/components/ui/cocktail-sunburst/cocktail-sunburst.component';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('CocktailSunburstComponent', () => {
  let component: CocktailSunburstComponent;
  let fixture: ComponentFixture<CocktailSunburstComponent>;

  const sampleIngredients: SunburstIngredientInput[] = [
    { nom: 'Gin', quantite: 4.5, unite: 'cl', category: 'light_liquor' },
    { nom: 'Jus de Citron jaune', quantite: 2.5, unite: 'cl', category: 'juices' },
    { nom: 'Sirop simple', quantite: 1.5, unite: 'cl', category: 'mixers' },
    { nom: 'Angostura aromatic bitters', quantite: 2, unite: 'dash', category: 'bitters' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocktailSunburstComponent, getTranslocoTestingModule()]
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailSunburstComponent);
    component = fixture.componentInstance;
    component.ingredients = sampleIngredients;
    component.cocktailName = 'Gin Sour';
    fixture.detectChanges();
  });

  it('should create the sunburst component', () => {
    expect(component).toBeTruthy();
  });

  describe('Mixology Classification & Normalization', () => {
    it('should classify spirit ingredients correctly from predefined category', () => {
      expect(classifyIngredientFamily('dark_liquor')).toBe('dark_liquor');
      expect(classifyIngredientFamily('light_liquor')).toBe('light_liquor');
      expect(classifyIngredientFamily('liqueurs')).toBe('liqueurs');
      expect(classifyIngredientFamily('wine_beer')).toBe('wine_beer');
      expect(classifyIngredientFamily('juices')).toBe('juices');
      expect(classifyIngredientFamily('fruits')).toBe('fruits');
      expect(classifyIngredientFamily('mixers')).toBe('mixers');
      expect(classifyIngredientFamily('herbs')).toBe('herbs');
      expect(classifyIngredientFamily('bitters')).toBe('bitters');
      expect(classifyIngredientFamily({ nom: 'Bourbon', category: 'dark_liquor' })).toBe('dark_liquor');
      expect(classifyIngredientFamily({ nom: 'Unknown' })).toBe('other');
    });

    it('should normalize units into milliliters', () => {
      expect(normalizeToMl(4.5, 'cl')).toBe(45);
      expect(normalizeToMl(30, 'ml')).toBe(30);
      expect(normalizeToMl(1, 'oz')).toBeCloseTo(29.57, 1);
      expect(normalizeToMl(2, 'dash')).toBeCloseTo(0.8, 1);
      expect(normalizeToMl(null, null, '60 ml')).toBe(60);
      expect(normalizeToMl(null, null, '2 cl')).toBe(20);
      expect(normalizeToMl(null, null, '1 oz')).toBeCloseTo(29.57, 1);
    });
  });

  describe('Proportions and Slices Generation', () => {
    it('should generate inner ring slices for each ingredient', () => {
      const slices = component.ingredientSlices();
      expect(slices).toHaveSize(4);
      expect(slices[0].name).toBe('Gin');
      expect(slices[0].familyKey).toBe('light_liquor');
      expect(slices[0].fraction).toBeGreaterThan(0.4);
    });

    it('should aggregate family slices for the outer ring', () => {
      const famSlices = component.familySlices();
      expect(famSlices.length).toBeGreaterThanOrEqual(3);

      const totalFraction = famSlices.reduce((acc, f) => acc + f.fraction, 0);
      expect(totalFraction).toBeCloseTo(1.0, 2);
    });

    it('should handle empty or fallback ingredients gracefully', () => {
      component.ingredients = [];
      fixture.detectChanges();
      expect(component.ingredientSlices()).toHaveSize(0);
      expect(component.familySlices()).toHaveSize(0);
    });
  });

  describe('Interactivity and Highlights', () => {
    it('should toggle active ingredient on select and clear', () => {
      const firstSlice = component.ingredientSlices()[0];
      component.onIngredientSelect(firstSlice);
      fixture.detectChanges();

      expect(component.activeIngredientId()).toBe(firstSlice.id);
      expect(component.isSliceHighlighted(firstSlice)).toBeTrue();

      const details = component.activeDetails();
      expect(details).toBeTruthy();
      expect(details?.title).toBe('Gin');

      // Clicking same slice clears selection
      component.onIngredientSelect(firstSlice);
      fixture.detectChanges();
      expect(component.activeIngredientId()).toBeNull();
      expect(component.activeDetails()).toBeNull();
    });

    it('should toggle active family on select', () => {
      component.onFamilySelect('bitters');
      fixture.detectChanges();

      expect(component.activeFamilyKey()).toBe('bitters');
      expect(component.isFamilyHighlighted('bitters')).toBeTrue();
      expect(component.isFamilyHighlighted('light_liquor')).toBeFalse();

      component.clearActive();
      expect(component.activeFamilyKey()).toBeNull();
    });
  });

  describe('DOM Rendering', () => {
    it('should render svg slices and accessible title in full mode', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const svg = compiled.querySelector('.sunburst-svg');
      expect(svg).toBeTruthy();

      const innerSlices = compiled.querySelectorAll('.inner-slice');
      expect(innerSlices).toHaveSize(4);

      const readout = compiled.querySelector('[data-testid="sunburst-readout"]');
      expect(readout).toBeTruthy();
    });

    it('should support mini mode without readout header', () => {
      component.mode = 'mini';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const readout = compiled.querySelector('[data-testid="sunburst-readout"]');
      expect(readout).toBeNull();
    });

    it('should compute selectedContourPath matching active slice geometry and clear on deselection', () => {
      expect(component.selectedContourPath()).toBeNull();

      const firstSlice = component.ingredientSlices()[0];
      component.onIngredientSelect(firstSlice);
      fixture.detectChanges();

      expect(component.selectedContourPath()).toBe(firstSlice.path);

      const compiled = fixture.nativeElement as HTMLElement;
      const contour = compiled.querySelector('.sunburst-selection-contour');
      expect(contour).not.toBeNull();
      expect(contour?.getAttribute('d')).toBe(firstSlice.path);

      component.clearActive();
      fixture.detectChanges();
      expect(component.selectedContourPath()).toBeNull();
      expect(compiled.querySelector('.sunburst-selection-contour')).toBeNull();
    });
  });
});
