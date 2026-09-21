import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { CocktailLibraryModalComponent } from '../../../app/features/cocktails/components/cocktail-library-modal/cocktail-library-modal.component';
import { CocktailLibraryService } from '../../../app/core/services/cocktail-library.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { CocktailLibraryItem, CocktailLibraryImportResult } from '../../../app/core/models/cocktail-library.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';

describe('CocktailLibraryModalComponent', () => {
  let component: CocktailLibraryModalComponent;
  let fixture: ComponentFixture<CocktailLibraryModalComponent>;
  let libraryServiceSpy: jasmine.SpyObj<CocktailLibraryService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const mockLibraryItems: CocktailLibraryItem[] = [
    {
      id: 'lib_1',
      nom: 'Mojito',
      description: 'Refreshing Cuban highball',
      categorie: 'ALCOOLISE',
      libraryCategory: 'IBA_CLASSICS',
      baseSpirit: 'RUM',
      ibaOfficial: true,
      prix: 9.0,
      alcoholLevel: 12.0,
      isMocktail: false,
      isVegan: true,
      isGlutenFree: true,
      glassware: 'Verre Tumbler',
      glasswareImage: 'assets/images/verres/verre_tumbler.png',
      imageUrl: 'assets/images/cocktails/mojito.webp',
      flavorProfiles: ['HERBAL', 'SOUR'],
      allergens: [],
      preparationTimeSeconds: 60,
      tags: ['classic', 'rum'],
      popularityScore: 100,
      isPopular: true,
      variantFamily: 'Mojito',
      variationOf: null,
      ingredients: [
        {
          nom: 'Rhum blanc',
          quantite: 5,
          unite: 'cl',
          degreAlcool: 40,
          coutUnitaire: 0.8,
          allergens: [],
          isVegan: true
        },
        {
          nom: 'Menthe',
          quantite: 6,
          unite: 'feuilles',
          degreAlcool: 0,
          coutUnitaire: 0.1,
          allergens: [],
          isVegan: true
        }
      ],
      recipeSteps: [],
      instructions: 'Muddle mint with sugar and lime, add rum, top with club soda.'
    },
    {
      id: 'lib_2',
      nom: 'Virgin Mojito',
      description: 'Zero alcohol mint refresher',
      categorie: 'SANS_ALCOOL',
      libraryCategory: 'MOCKTAILS',
      baseSpirit: 'NON_ALCOHOLIC',
      ibaOfficial: false,
      prix: 6.5,
      alcoholLevel: 0,
      isMocktail: true,
      isVegan: true,
      isGlutenFree: true,
      glassware: 'Verre Tumbler',
      glasswareImage: 'assets/images/verres/verre_tumbler.png',
      imageUrl: 'assets/images/cocktails/virgin-mojito.webp',
      flavorProfiles: ['HERBAL', 'SWEET'],
      allergens: [],
      preparationTimeSeconds: 45,
      tags: ['mocktail'],
      popularityScore: 60,
      isPopular: false,
      variantFamily: 'Mojito',
      variationOf: 'Mojito',
      ingredients: [
        {
          nom: 'Menthe',
          quantite: 6,
          unite: 'feuilles',
          degreAlcool: 0,
          coutUnitaire: 0.1,
          allergens: [],
          isVegan: true
        },
        {
          nom: 'Eau gazeuse',
          quantite: 15,
          unite: 'cl',
          degreAlcool: 0,
          coutUnitaire: 0.1,
          allergens: [],
          isVegan: true
        }
      ],
      recipeSteps: [],
      instructions: 'Muddle mint, top with soda.'
    },
    {
      id: 'lib_3',
      nom: 'Espresso Martini',
      description: 'Sophisticated coffee cocktail',
      categorie: 'ALCOOLISE',
      libraryCategory: 'CONTEMPORARY',
      baseSpirit: 'VODKA',
      ibaOfficial: true,
      prix: 11.0,
      alcoholLevel: 18.0,
      isMocktail: false,
      isVegan: true,
      isGlutenFree: true,
      glassware: 'Coupe à cocktail',
      glasswareImage: 'assets/images/verres/verre_martini.png',
      imageUrl: 'assets/images/cocktails/expresso-martini.webp',
      flavorProfiles: ['BITTER', 'SWEET'],
      allergens: [],
      preparationTimeSeconds: 90,
      tags: ['coffee', 'vodka'],
      popularityScore: 90,
      isPopular: true,
      variantFamily: 'Martini',
      variationOf: null,
      ingredients: [
        {
          nom: 'Vodka',
          quantite: 5,
          unite: 'cl',
          degreAlcool: 40,
          coutUnitaire: 0.9,
          allergens: [],
          isVegan: true
        },
        {
          nom: 'Kahlua',
          quantite: 2,
          unite: 'cl',
          degreAlcool: 20,
          coutUnitaire: 0.7,
          allergens: [],
          isVegan: true
        },
        {
          nom: 'Espresso',
          quantite: 3,
          unite: 'cl',
          degreAlcool: 0,
          coutUnitaire: 0.3,
          allergens: [],
          isVegan: true
        }
      ],
      recipeSteps: [],
      instructions: 'Shake with ice and strain.'
    }
  ];

  beforeEach(async () => {
    libraryServiceSpy = jasmine.createSpyObj('CocktailLibraryService', ['getLibraryCocktails', 'importCocktails', 'getWheelData']);
    libraryServiceSpy.getLibraryCocktails.and.returnValue(of(mockLibraryItems));
    libraryServiceSpy.getWheelData.and.returnValue(of({
      categories: {},
      nodes: [],
      edges: []
    }));

    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getAll']);
    ingredientServiceSpy.getAll.and.returnValue(of([]));

    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo(toastSpy);

    await TestBed.configureTestingModule({
      imports: [
        CocktailLibraryModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: CocktailLibraryService, useValue: libraryServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CocktailLibraryModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load cocktail library catalog', () => {
    expect(component).toBeTruthy();
    expect(libraryServiceSpy.getLibraryCocktails).toHaveBeenCalled();
    expect(component.allCocktails()).toHaveSize(3);
    expect(component.filteredCocktails()).toHaveSize(3);
    expect(component.isLoading()).toBeFalse();
  });

  it('should handle catalog load error gracefully', () => {
    libraryServiceSpy.getLibraryCocktails.and.returnValue(throwError(() => ({ error: { message: 'Network failure' } })));
    component.loadCatalog();

    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('Network failure');
  });

  it('should toggle selection of cocktail items', () => {
    expect(component.selectedCount()).toBe(0);
    expect(component.isSelected('lib_1')).toBeFalse();

    component.toggleSelection('lib_1');
    expect(component.selectedCount()).toBe(1);
    expect(component.isSelected('lib_1')).toBeTrue();

    component.toggleSelection('lib_1');
    expect(component.selectedCount()).toBe(0);
    expect(component.isSelected('lib_1')).toBeFalse();
  });

  it('should batch select all visible, IBA classics, and mocktails', () => {
    component.selectAllVisible();
    expect(component.selectedCount()).toBe(3);

    component.deselectAll();
    expect(component.selectedCount()).toBe(0);

    component.selectIbaClassics();
    expect(component.selectedCount()).toBe(2);
    expect(component.isSelected('lib_1')).toBeTrue();
    expect(component.isSelected('lib_3')).toBeTrue();

    component.deselectAll();
    component.selectMocktails();
    expect(component.selectedCount()).toBe(1);
    expect(component.isSelected('lib_2')).toBeTrue();
  });

  it('should filter cocktails by search query, category, and base spirit', () => {
    component.searchQuery.set('Mojito');
    expect(component.filteredCocktails()).toHaveSize(2);

    component.selectedCategory.set('IBA_CLASSICS');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].id).toBe('lib_1');

    component.searchQuery.set('');
    component.selectedCategory.set('ALL');
    component.selectedBaseSpirit.set('VODKA');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].nom).toBe('Espresso Martini');
  });

  it('should filter cocktails by flavor profile', () => {
    component.selectedFlavor.set('SOUR');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].nom).toBe('Mojito');
  });

  it('should open and close recipe preview drawer', () => {
    expect(component.previewItem()).toBeNull();

    component.openPreview(mockLibraryItems[0]);
    expect(component.previewItem()).toEqual(mockLibraryItems[0]);

    component.closePreview();
    expect(component.previewItem()).toBeNull();
  });

  it('should emit selectionConfirmed in emitSelectionOnly mode without calling backend import', () => {
    component.emitSelectionOnly = true;
    spyOn(component.selectionConfirmed, 'emit');

    component.toggleSelection('lib_1');
    component.toggleSelection('lib_2');
    component.executeImport();

    expect(component.selectionConfirmed.emit).toHaveBeenCalledWith(['lib_1', 'lib_2']);
    expect(libraryServiceSpy.importCocktails).not.toHaveBeenCalled();
  });

  it('should execute backend import in standalone modal mode and show toast', async () => {
    const importResult: CocktailLibraryImportResult = {
      importedCount: 1,
      skippedCount: 0,
      newIngredientsCount: 2,
      reusedIngredientsCount: 0,
      importedCocktails: ['Mojito'],
      skippedCocktails: [],
      message: '1 cocktail imported'
    };
    libraryServiceSpy.importCocktails.and.returnValue(of(importResult));

    component.isModal = true;
    component.toggleSelection('lib_1');
    component.executeImport();
    await fixture.whenStable();

    expect(libraryServiceSpy.importCocktails).toHaveBeenCalledWith({
      cocktailIds: ['lib_1']
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(importResult, 'imported');
  });

  it('should handle import error and display error toast', async () => {
    libraryServiceSpy.importCocktails.and.returnValue(throwError(() => new Error('Import failed')));

    component.toggleSelection('lib_1');
    component.executeImport();
    await fixture.whenStable();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  });

  it('should fallback to placeholder image onThumbError()', () => {
    const imgElement = document.createElement('img');
    const event = { target: imgElement } as unknown as Event;

    component.onThumbError(event);
    expect(imgElement.src).toContain('assets/images/verres/verre_tumbler.png');
  });

  /* INGREDIENT BUILDER TESTS */
  it('should switch between catalog and ingredient builder tabs', () => {
    expect(component.activeTab()).toBe('all');

    component.activeTab.set('builder');
    expect(component.activeTab()).toBe('builder');
  });

  it('should compute allKnownIngredients and builder suggestions', () => {
    const known = component.allKnownIngredients();
    expect(known).toContain('Menthe');
    expect(known).toContain('Rhum blanc');
    expect(known).toContain('Eau gazeuse');
    expect(known).toContain('Vodka');

    component.builderSearchInput.set('ment');
    expect(component.builderSuggestions()).toEqual(['Menthe']);
  });

  it('should add, remove, and clear shelf ingredients', () => {
    expect(component.shelfIngredients()).toHaveSize(0);

    component.addToShelf('Menthe');
    expect(component.shelfIngredients()).toEqual(['Menthe']);
    expect(component.builderSearchInput()).toBe('');

    // Duplicate check
    component.addToShelf('menthe');
    expect(component.shelfIngredients()).toHaveSize(1);

    component.addToShelf('Eau gazeuse');
    expect(component.shelfIngredients()).toHaveSize(2);

    component.removeFromShelf('Menthe');
    expect(component.shelfIngredients()).toEqual(['Eau gazeuse']);

    component.clearShelf();
    expect(component.shelfIngredients()).toHaveSize(0);
  });

  it('should calculate builder matches: ready to make, 1-away, and recommended next purchase', () => {
    // Empty shelf -> empty matches
    expect(component.builderMatches().ready).toHaveSize(0);
    expect(component.builderMatches().oneAway).toHaveSize(0);
    expect(component.builderMatches().recommendedNext).toBeNull();

    // Shelf with Menthe + Eau gazeuse -> Virgin Mojito is ready (100%), Mojito is 1 away
    component.addToShelf('Menthe');
    component.addToShelf('Eau gazeuse');

    const matches = component.builderMatches();
    expect(matches.ready).toHaveSize(1);
    expect(matches.ready[0].nom).toBe('Virgin Mojito');

    expect(matches.oneAway).toHaveSize(1);
    expect(matches.oneAway[0].cocktail.nom).toBe('Mojito');
    expect(matches.oneAway[0].missing).toBe('Rhum blanc');

    expect(matches.recommendedNext).toEqual({
      ingredient: 'Rhum blanc',
      count: 1
    });

    // Add Rhum blanc to shelf -> Mojito becomes ready too!
    component.addToShelf('Rhum blanc');
    const updated = component.builderMatches();
    expect(updated.ready).toHaveSize(2);
    expect(updated.oneAway).toHaveSize(0);
  });

  it('should load current positive stock ingredients into builder shelf', async () => {
    const mockStock: Ingredient[] = [
      {
        id: 1,
        nom: 'Vodka',
        quantiteStock: 5,
        seuilAlerte: 2,
        uniteMesure: 'l',
        degreAlcool: 40,
        prixUnitaire: 20,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 2,
        nom: 'Tequila',
        quantiteStock: 0, // out of stock
        seuilAlerte: 1,
        uniteMesure: 'l',
        degreAlcool: 40,
        prixUnitaire: 25,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 3,
        nom: 'Kahlua',
        quantiteStock: 2,
        seuilAlerte: 1,
        uniteMesure: 'l',
        degreAlcool: 20,
        prixUnitaire: 18,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      }
    ];
    ingredientServiceSpy.getAll.and.returnValue(of(mockStock));

    component.loadCurrentStockIntoBuilder();
    await fixture.whenStable();

    expect(ingredientServiceSpy.getAll).toHaveBeenCalled();
    expect(component.shelfIngredients()).toEqual(['Vodka', 'Kahlua']);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'success'
    }));
  });

  it('should notify user when no positive stock ingredients are available', async () => {
    const emptyStock: Ingredient[] = [
      {
        id: 1,
        nom: 'Gin',
        quantiteStock: 0,
        seuilAlerte: 1,
        uniteMesure: 'l',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      }
    ];
    ingredientServiceSpy.getAll.and.returnValue(of(emptyStock));

    component.loadCurrentStockIntoBuilder();
    await fixture.whenStable();

    expect(component.shelfIngredients()).toHaveSize(0);
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'warning'
    }));
  });

  describe('Sorting and Advanced Filtering', () => {
    it('should sort by popularity descending by default', () => {
      expect(component.selectedSort()).toBe('POPULARITY');
      const filtered = component.filteredCocktails();
      expect(filtered[0].nom).toBe('Mojito'); // 100
      expect(filtered[1].nom).toBe('Espresso Martini'); // 90
      expect(filtered[2].nom).toBe('Virgin Mojito'); // 60
    });

    it('should sort by name ascending when selected', () => {
      component.selectedSort.set('NAME_ASC');
      const filtered = component.filteredCocktails();
      expect(filtered[0].nom).toBe('Espresso Martini');
      expect(filtered[1].nom).toBe('Mojito');
      expect(filtered[2].nom).toBe('Virgin Mojito');
    });

    it('should sort by alcohol level descending when selected', () => {
      component.selectedSort.set('ALCOHOL_DESC');
      const filtered = component.filteredCocktails();
      expect(filtered[0].nom).toBe('Espresso Martini'); // 18%
      expect(filtered[1].nom).toBe('Mojito'); // 12%
      expect(filtered[2].nom).toBe('Virgin Mojito'); // 0%
    });

    it('should filter by glassware', () => {
      component.selectedGlassware.set('Coupe à cocktail');
      const filtered = component.filteredCocktails();
      expect(filtered).toHaveSize(1);
      expect(filtered[0].nom).toBe('Espresso Martini');
      expect(filtered[0].glassware).toBe('Coupe à cocktail');
    });

    it('should filter by alcohol strength range (MOCKTAIL vs LIGHT vs MEDIUM vs STRONG)', () => {
      component.selectedAbvRange.set('MOCKTAIL');
      const mocktails = component.filteredCocktails();
      expect(mocktails).toHaveSize(1);
      expect(mocktails[0].nom).toBe('Virgin Mojito');

      component.selectedAbvRange.set('LIGHT');
      const light = component.filteredCocktails();
      expect(light).toHaveSize(1);
      expect(light[0].nom).toBe('Mojito'); // 12%

      component.selectedAbvRange.set('MEDIUM');
      const medium = component.filteredCocktails();
      expect(medium).toHaveSize(1);
      expect(medium[0].nom).toBe('Espresso Martini'); // 18%
    });

    it('should filter by recipe complexity', () => {
      component.selectedComplexity.set('EXPRESS'); // <= 3 ingredients
      const express = component.filteredCocktails();
      expect(express.length).toBeGreaterThan(0);
    });

    it('should filter by variant family', () => {
      component.selectedVariantFamily.set('Mojito');
      const mojitoFamily = component.filteredCocktails();
      expect(mojitoFamily).toHaveSize(2);
      expect(mojitoFamily.map(c => c.nom)).toContain('Mojito');
      expect(mojitoFamily.map(c => c.nom)).toContain('Virgin Mojito');
    });

    it('should filter by popular/iconic drinks only', () => {
      component.showPopularOnly.set(true);
      const popular = component.filteredCocktails();
      expect(popular).toHaveSize(2);
      expect(popular.map(c => c.nom)).toContain('Mojito');
      expect(popular.map(c => c.nom)).toContain('Espresso Martini');
      expect(popular.map(c => c.nom)).not.toContain('Virgin Mojito');
    });

    it('should compute related variants when previewing a cocktail from a variant family', () => {
      component.openPreview(mockLibraryItems[1]); // Virgin Mojito (family: 'Mojito')
      expect(component.previewItem()).toEqual(mockLibraryItems[1]);

      const related = component.relatedVariants();
      expect(related).toHaveSize(1);
      expect(related[0].nom).toBe('Mojito');
    });

    it('should reset all filters back to default values', () => {
      component.searchQuery.set('rum');
      component.selectedCategory.set('IBA_CLASSICS');
      component.selectedBaseSpirit.set('RUM');
      component.selectedFlavor.set('HERBAL');
      component.selectedGlassware.set('Verre Tumbler');
      component.selectedAbvRange.set('LIGHT');
      component.selectedComplexity.set('EXPRESS');
      component.selectedVariantFamily.set('Mojito');
      component.showPopularOnly.set(true);
      component.selectedSort.set('PRICE_DESC');

      component.resetAllFilters();

      expect(component.searchQuery()).toBe('');
      expect(component.selectedCategory()).toBe('ALL');
      expect(component.selectedBaseSpirit()).toBe('ALL');
      expect(component.selectedFlavor()).toBe('ALL');
      expect(component.selectedGlassware()).toBe('ALL');
      expect(component.selectedAbvRange()).toBe('ALL');
      expect(component.selectedComplexity()).toBe('ALL');
      expect(component.selectedVariantFamily()).toBe('ALL');
      expect(component.showPopularOnly()).toBeFalse();
      expect(component.selectedSort()).toBe('POPULARITY');
    });
  });

  describe('Connection Wheel Tab Integration', () => {
    it('should switch to wheel tab and render wheel view', () => {
      component.activeTab.set('wheel');
      fixture.detectChanges();

      expect(component.activeTab()).toBe('wheel');
      const wheelEl = fixture.nativeElement.querySelector('[data-testid="library-wheel-view"]');
      expect(wheelEl).toBeTruthy();
    });

    it('should handle onWheelPairSelected and transition to catalog with pre-filled search', () => {
      component.activeTab.set('wheel');
      component.onWheelPairSelected({ ingredientA: 'Gin', ingredientB: 'Vermouth', count: 15 });

      expect(component.searchQuery()).toBe('Gin + Vermouth');
      expect(component.activeTab()).toBe('all');
      expect(component.currentPage()).toBe(1);
    });

    it('should handle onWheelExploreCocktails and transition to catalog with first ingredient', () => {
      component.activeTab.set('wheel');
      component.onWheelExploreCocktails({ ingredients: ['Bourbon', 'Angostura'] });

      expect(component.searchQuery()).toBe('Bourbon + Angostura');
      expect(component.activeTab()).toBe('all');
      expect(component.currentPage()).toBe(1);
    });
  });
});
