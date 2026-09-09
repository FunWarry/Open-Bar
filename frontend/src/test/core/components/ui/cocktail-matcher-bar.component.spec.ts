import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CocktailMatcherBarComponent, CocktailMatcherFilters } from '../../../../app/core/components/ui/cocktail-matcher-bar/cocktail-matcher-bar.component';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { CocktailFacets, FlavorProfile } from '../../../../app/core/models/cocktail.model';

describe('CocktailMatcherBarComponent', () => {
  let component: CocktailMatcherBarComponent;
  let fixture: ComponentFixture<CocktailMatcherBarComponent>;

  const mockFacets: CocktailFacets = {
    totalAvailable: 12,
    flavorCounts: {
      FRUITY: 5,
      SWEET: 4,
      SOUR: 3,
      SMOKY: 1,
      BITTER: 2,
      SPICY: 1,
      HERBAL: 3,
    },
    mocktailsCount: 4,
    veganCount: 8,
    glutenFreeCount: 6,
    lowAbvCount: 2,
    minAlcoholLevel: 0,
    maxAlcoholLevel: 25,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocktailMatcherBarComponent, getTranslocoTestingModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailMatcherBarComponent);
    component = fixture.componentInstance;
    component.facets = mockFacets;
    fixture.detectChanges();
  });

  it('should create the matcher bar component', () => {
    expect(component).toBeTruthy();
    expect(component.availableFlavors).toHaveSize(7);
  });

  it('should correctly detect if flavor is active and toggle selection', () => {
    expect(component.isFlavorActive('FRUITY')).toBeFalse();

    let emittedFilters: CocktailMatcherFilters | undefined;
    component.filtersChange.subscribe((f) => (emittedFilters = f));

    // Toggle on
    component.toggleFlavor('FRUITY');
    expect(component.isFlavorActive('FRUITY')).toBeTrue();
    expect(emittedFilters?.flavors).toContain('FRUITY');

    // Toggle off
    component.toggleFlavor('FRUITY');
    expect(component.isFlavorActive('FRUITY')).toBeFalse();
    expect(emittedFilters?.flavors).not.toContain('FRUITY');
  });

  it('should toggle dietary preferences and emit updated filters', () => {
    let emittedFilters: CocktailMatcherFilters | undefined;
    component.filtersChange.subscribe((f) => (emittedFilters = f));

    component.toggleDietary('mocktail');
    expect(component.mocktail).toBeTrue();
    expect(emittedFilters?.mocktail).toBeTrue();

    component.toggleDietary('vegan');
    expect(component.vegan).toBeTrue();
    expect(emittedFilters?.vegan).toBeTrue();

    component.toggleDietary('glutenFree');
    expect(component.glutenFree).toBeTrue();
    expect(emittedFilters?.glutenFree).toBeTrue();

    component.toggleDietary('lowAbv');
    expect(component.lowAbv).toBeTrue();
    expect(emittedFilters?.lowAbv).toBeTrue();
  });

  it('should evaluate hasActiveFilters accurately', () => {
    expect(component.hasActiveFilters()).toBeFalse();

    component.toggleFlavor('SMOKY');
    expect(component.hasActiveFilters()).toBeTrue();

    component.clearAll();
    expect(component.hasActiveFilters()).toBeFalse();
    expect(component.activeFlavors).toHaveSize(0);
  });

  it('should clear all filters and emit reset event', () => {
    spyOn(component.resetFilters, 'emit');
    component.activeFlavors = ['SWEET', 'HERBAL'];
    component.mocktail = true;
    component.vegan = true;

    component.clearAll();

    expect(component.activeFlavors).toEqual([]);
    expect(component.mocktail).toBeFalse();
    expect(component.vegan).toBeFalse();
    expect(component.glutenFree).toBeFalse();
    expect(component.lowAbv).toBeFalse();
    expect(component.resetFilters.emit).toHaveBeenCalled();
  });

  it('should return flavor count from facets', () => {
    expect(component.getFlavorCount('FRUITY')).toBe(5);
    expect(component.getFlavorCount('SMOKY')).toBe(1);

    component.facets = null;
    expect(component.getFlavorCount('FRUITY')).toBeNull();
  });

  it('should support toggling showMocktail input visibility', () => {
    expect(component.showMocktail).toBeTrue();
    component.showMocktail = false;
    fixture.detectChanges();
    const mocktailBtn = fixture.nativeElement.querySelector('[data-testid="matcher-dietary-mocktail"]');
    expect(mocktailBtn).toBeNull();
  });
});

