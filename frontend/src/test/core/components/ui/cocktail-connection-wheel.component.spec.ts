import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  CocktailConnectionWheelComponent,
  CocktailPartnerItem
} from '../../../../app/core/components/ui/cocktail-connection-wheel/cocktail-connection-wheel.component';
import { CocktailLibraryService } from '../../../../app/core/services/cocktail-library.service';
import { CocktailConnectionWheelData } from '../../../../app/core/models/cocktail-library.model';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';

describe('CocktailConnectionWheelComponent', () => {
  let component: CocktailConnectionWheelComponent;
  let fixture: ComponentFixture<CocktailConnectionWheelComponent>;
  let mockLibraryService: jasmine.SpyObj<CocktailLibraryService>;

  const mockWheelData: CocktailConnectionWheelData = {
    categories: {
      light_liquor: { label: 'Light liquor', labelFr: 'Spiritueux blancs', short: 'Light liquor', shortFr: 'Blancs', color: '#b5705c' },
      dark_liquor: { label: 'Dark liquor', labelFr: 'Spiritueux bruns', short: 'Dark liquor', shortFr: 'Bruns', color: '#7e3b34' },
      mixers: { label: 'Mixers & sweeteners', labelFr: 'Mélanges & sirops', short: 'Mixers', shortFr: 'Sirops', color: '#8585b3' },
      fruits: { label: 'Fruit & citrus', labelFr: 'Fruits & agrumes', short: 'Fruit', shortFr: 'Fruits', color: '#bd9d3e' }
    },
    nodes: [
      { id: 'gin', label: 'Gin', group: 'light_liquor', sourceIndex: 0, count: 2 },
      { id: 'bourbon', label: 'Bourbon', group: 'dark_liquor', sourceIndex: 1, count: 2 },
      { id: 'vermouth', label: 'Vermouth', group: 'light_liquor', sourceIndex: 2, count: 2 },
      { id: 'lemon juice', label: 'Lemon juice', group: 'fruits', sourceIndex: 3, count: 2 },
      { id: 'simple syrup', label: 'Simple syrup', group: 'mixers', sourceIndex: 4, count: 2 }
    ],
    edges: [
      { a: 'gin', b: 'vermouth', count: 18 },
      { a: 'gin', b: 'lemon juice', count: 14 },
      { a: 'vermouth', b: 'lemon juice', count: 6 },
      { a: 'bourbon', b: 'simple syrup', count: 10 },
      { a: 'lemon juice', b: 'simple syrup', count: 8 },
      { a: 'bourbon', b: 'vermouth', count: 4 }
    ]
  };

  beforeEach(async () => {
    mockLibraryService = jasmine.createSpyObj<CocktailLibraryService>('CocktailLibraryService', ['getWheelData']);
    mockLibraryService.getWheelData.and.returnValue(of(mockWheelData));

    await TestBed.configureTestingModule({
      imports: [
        CocktailConnectionWheelComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CocktailLibraryService, useValue: mockLibraryService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailConnectionWheelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load graph dataset', () => {
    expect(component).toBeTruthy();
    expect(mockLibraryService.getWheelData).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
    expect(component.rawData()).toEqual(mockWheelData);
  });

  describe('Chord Layout & Geometry Calculation', () => {
    it('should generate complete wheel geometry', () => {
      const geom = component.geometry();
      expect(geom).toBeTruthy();
      expect(geom?.nodes.length).toBe(5);
      expect(geom?.links.length).toBe(6);
      expect(geom?.families.length).toBe(4);
    });

    it('should index links by ingredient and by category', () => {
      const geom = component.geometry();
      expect(geom).toBeTruthy();

      const ginLinks = geom?.byIngredient.get('gin');
      expect(ginLinks).toBeDefined();
      expect(ginLinks?.length).toBe(2);

      const lightLiquorLinks = geom?.byCategory.get('light_liquor');
      expect(lightLiquorLinks).toBeDefined();
      expect(lightLiquorLinks?.length).toBeGreaterThanOrEqual(2);
    });

    it('should compute valid radial coordinate transformations for labels', () => {
      const geom = component.geometry();
      const node = geom?.nodes[0];
      expect(node).toBeDefined();
      expect(node?.labelTransform).toContain('translate(');
      expect(node?.labelTransform).toContain('rotate(');
      expect(['start', 'end']).toContain(node?.anchor || '');
    });
  });

  describe('Connection Limit Filtering', () => {
    it('should filter edges according to limit threshold', () => {
      component.onLimitChange(2);
      fixture.detectChanges();

      expect(component.connectionLimit()).toBe(2);
      const graph = component.filteredGraph();
      expect(graph?.edges.length).toBe(2);
    });

    it('should drop disconnected ingredients when limit threshold is low', () => {
      // Top 1 edge: gin + vermouth
      component.onLimitChange(1);
      fixture.detectChanges();

      const graph = component.filteredGraph();
      expect(graph?.edges.length).toBe(1);
      expect(graph?.nodes.length).toBe(2);
      expect(graph?.nodes.map(n => n.id)).toEqual(jasmine.arrayContaining(['gin', 'vermouth']));
      expect(graph?.nodes.some(n => n.id === 'bourbon')).toBeFalse();
    });

    it('should reset active focus when connection threshold changes', () => {
      component.selectIngredient('gin');
      expect(component.selectedIngredientId()).toBe('gin');

      component.onLimitChange(250);
      expect(component.selectedIngredientId()).toBeNull();
      expect(component.hasActiveFocus()).toBeFalse();
    });
  });

  describe('Ingredient and Category Selection', () => {
    it('should lock ingredient selection and highlight its chords', () => {
      component.selectIngredient('gin');
      fixture.detectChanges();

      expect(component.selectedIngredientId()).toBe('gin');
      expect(component.hasActiveFocus()).toBeTrue();
      expect(component.selectedIngredient()?.label).toBe('Gin');

      const highlighted = component.highlightedLinks();
      expect(highlighted.size).toBe(2);
    });

    it('should toggle selection off when clicking the same ingredient', () => {
      component.selectIngredient('gin');
      expect(component.selectedIngredientId()).toBe('gin');

      component.selectIngredient('gin');
      expect(component.selectedIngredientId()).toBeNull();
      expect(component.hasActiveFocus()).toBeFalse();
    });

    it('should populate ranked partners in descending order of shared recipes', () => {
      component.selectIngredient('gin');
      fixture.detectChanges();

      const partners: CocktailPartnerItem[] = component.partnerRankings();
      expect(partners).toHaveSize(2);
      expect(partners[0].id).toBe('vermouth');
      expect(partners[0].count).toBe(18);
      expect(partners[1].id).toBe('lemon juice');
      expect(partners[1].count).toBe(14);
    });

    it('should lock category family selection', () => {
      component.selectCategory('dark_liquor');
      fixture.detectChanges();

      expect(component.selectedCategoryId()).toBe('dark_liquor');
      expect(component.selectedIngredientId()).toBeNull();
      expect(component.hasActiveFocus()).toBeTrue();
    });

    it('should clear selection on Escape key', () => {
      component.selectIngredient('bourbon');
      expect(component.hasActiveFocus()).toBeTrue();

      component.onEscape();
      expect(component.hasActiveFocus()).toBeFalse();
      expect(component.selectedIngredientId()).toBeNull();
    });
  });

  describe('Ribbon Hover and Interactions', () => {
    it('should display floating readout tooltip on ribbon enter', () => {
      const geom = component.geometry();
      const firstLink = geom?.links[0];
      expect(firstLink).toBeDefined();

      const mockMouseEvent = { clientX: 200, clientY: 150 } as MouseEvent;
      component.onRibbonEnter(firstLink!, mockMouseEvent);
      fixture.detectChanges();

      expect(component.hoveredLink()).toBe(firstLink!);
      const tooltip = component.tooltip();
      expect(tooltip.visible).toBeTrue();
      expect(tooltip.x).toBe(200);
      expect(tooltip.y).toBe(150);
      expect(tooltip.count).toBe(firstLink!.count);
    });

    it('should update tooltip coordinates on pointer move', () => {
      const geom = component.geometry();
      const firstLink = geom?.links[0];
      component.onRibbonEnter(firstLink!, { clientX: 100, clientY: 100 } as MouseEvent);

      component.onPointerMove({ clientX: 250, clientY: 300 } as MouseEvent);
      expect(component.tooltip().x).toBe(250);
      expect(component.tooltip().y).toBe(300);
    });

    it('should hide tooltip on ribbon leave', () => {
      const geom = component.geometry();
      const firstLink = geom?.links[0];
      component.onRibbonEnter(firstLink!, { clientX: 100, clientY: 100 } as MouseEvent);

      component.onRibbonLeave();
      expect(component.tooltip().visible).toBeFalse();
      expect(component.hoveredLink()).toBeNull();
    });

    it('should emit pairSelected when clicking a ribbon link', () => {
      spyOn(component.pairSelected, 'emit');
      const geom = component.geometry();
      const link = geom?.links[0];
      expect(link).toBeDefined();

      component.onRibbonClick(link!);
      expect(component.pairSelected.emit).toHaveBeenCalledWith({
        ingredientA: link!.a,
        ingredientB: link!.b,
        count: link!.count
      });
    });

    it('should emit exploreCocktails when clicking explore pair', () => {
      spyOn(component.exploreCocktails, 'emit');
      component.selectIngredient('gin');

      component.explorePair('vermouth');
      expect(component.exploreCocktails.emit).toHaveBeenCalledWith({
        ingredients: ['Gin', 'Vermouth']
      });
    });
  });

  describe('Search and Edge Cases', () => {
    it('should filter search autocomplete matches by query', () => {
      component.searchQuery.set('lem');
      fixture.detectChanges();

      const matches = component.searchMatches();
      expect(matches).toHaveSize(1);
      expect(matches[0].id).toBe('lemon juice');
    });

    it('should handle service error gracefully without crashing', () => {
      mockLibraryService.getWheelData.and.returnValue(throwError(() => new Error('Network error')));
      component.loadGraphData();
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.rawData()).toBeNull();
      expect(component.geometry()).toBeNull();
    });
  });

  describe('Cumulative Multi-Ingredient Selection', () => {
    it('should allow toggling multiple ingredients into cumulative selection', () => {
      component.toggleIngredient('gin');
      expect(component.selectedIngredientIds()).toEqual(['gin']);
      expect(component.isIngredientSelected('gin')).toBeTrue();

      component.toggleIngredient('vermouth');
      expect(component.selectedIngredientIds()).toEqual(['gin', 'vermouth']);
      expect(component.isIngredientSelected('vermouth')).toBeTrue();
      expect(component.selectedIngredients()).toHaveSize(2);

      // Toggling gin again should remove it
      component.toggleIngredient('gin');
      expect(component.selectedIngredientIds()).toEqual(['vermouth']);
      expect(component.isIngredientSelected('gin')).toBeFalse();
    });

    it('should remove specific ingredient from selection and clear all', () => {
      component.toggleIngredient('gin');
      component.toggleIngredient('vermouth');
      component.toggleIngredient('lemon juice');
      expect(component.selectedIngredientIds()).toHaveSize(3);

      component.removeIngredient('vermouth');
      expect(component.selectedIngredientIds()).toEqual(['gin', 'lemon juice']);

      component.clearSelection();
      expect(component.selectedIngredientIds()).toHaveSize(0);
      expect(component.hasActiveFocus()).toBeFalse();
    });

    it('should emit exploreCocktails with all selected ingredient labels', () => {
      spyOn(component.exploreCocktails, 'emit');
      component.toggleIngredient('gin');
      component.toggleIngredient('vermouth');

      component.exploreCombined();
      expect(component.exploreCocktails.emit).toHaveBeenCalledWith({
        ingredients: ['Gin', 'Vermouth']
      });
    });

    it('should keep idle view pristine and display labels on case hover or selection', () => {
      const geom = component.geometry();
      expect(geom).not.toBeNull();
      const nodes = geom!.nodes;

      // In idle view, ZERO labels are displayed to keep chart uncluttered (DrinkWithData style)
      const idleVisible = nodes.filter(n => component.isNodeLabelVisible(n));
      expect(idleVisible).toHaveSize(0);

      // When hovering over gin's case, gin label becomes visible
      component.hoveredIngredientId.set('gin');
      const ginNode = nodes.find(n => n.id === 'gin');
      expect(component.isNodeLabelVisible(ginNode!)).toBeTrue();

      // When selecting gin, gin remains visible even when unhovered
      component.hoveredIngredientId.set(null);
      component.toggleIngredient('gin');
      expect(component.isNodeLabelVisible(ginNode!)).toBeTrue();
    });
  });
});

