import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { CocktailLibraryModalComponent } from '../../../app/features/cocktails/components/cocktail-library-modal/cocktail-library-modal.component';
import { CocktailLibraryService } from '../../../app/core/services/cocktail-library.service';
import { CocktailLibraryItem, CocktailLibraryImportResult } from '../../../app/core/models/cocktail-library.model';

describe('CocktailLibraryModalComponent', () => {
  let component: CocktailLibraryModalComponent;
  let fixture: ComponentFixture<CocktailLibraryModalComponent>;
  let libraryServiceSpy: jasmine.SpyObj<CocktailLibraryService>;
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
      glassware: 'Tumbler',
      glasswareImage: 'assets/images/verres/verre_tumbler.png',
      imageUrl: 'assets/images/verres/verre_tumbler.png',
      flavorProfiles: ['HERBAL', 'SOUR'],
      allergens: [],
      preparationTimeSeconds: 60,
      tags: ['classic', 'rum'],
      ingredients: [
        {
          nom: 'Rhum blanc',
          quantite: 5,
          unite: 'cl',
          degreAlcool: 40,
          coutUnitaire: 0.8,
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
      alcoholLevel: 0.0,
      isMocktail: true,
      isVegan: true,
      isGlutenFree: true,
      glassware: 'Tumbler',
      glasswareImage: 'assets/images/verres/verre_tumbler.png',
      imageUrl: 'assets/images/verres/verre_tumbler.png',
      flavorProfiles: ['HERBAL', 'SWEET'],
      allergens: [],
      preparationTimeSeconds: 45,
      tags: ['mocktail', 'virgin'],
      ingredients: [
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
      instructions: 'Muddle mint and sugar, top with sparkling water.'
    },
    {
      id: 'lib_3',
      nom: 'Espresso Martini',
      description: 'Rich coffee and vodka cocktail',
      categorie: 'ALCOOLISE',
      libraryCategory: 'CONTEMPORARY',
      baseSpirit: 'VODKA',
      ibaOfficial: true,
      prix: 11.0,
      alcoholLevel: 18.0,
      isMocktail: false,
      isVegan: true,
      isGlutenFree: true,
      glassware: 'Coupe',
      glasswareImage: 'assets/images/verres/verre_coupe.png',
      imageUrl: 'assets/images/verres/verre_coupe.png',
      flavorProfiles: ['BITTER', 'SWEET'],
      allergens: [],
      preparationTimeSeconds: 90,
      tags: ['coffee', 'vodka'],
      ingredients: [],
      recipeSteps: [],
      instructions: 'Shake with ice and strain.'
    }
  ];

  beforeEach(async () => {
    libraryServiceSpy = jasmine.createSpyObj('CocktailLibraryService', ['getLibraryCocktails', 'importCocktails']);
    libraryServiceSpy.getLibraryCocktails.and.returnValue(of(mockLibraryItems));

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

  it('should filter cocktails by category', () => {
    component.selectedCategory.set('IBA_CLASSICS');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].nom).toBe('Mojito');

    component.selectedCategory.set('MOCKTAILS');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].nom).toBe('Virgin Mojito');

    component.selectedCategory.set('ALL');
    expect(component.filteredCocktails()).toHaveSize(3);
  });

  it('should filter cocktails by base spirit', () => {
    component.selectedBaseSpirit.set('VODKA');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].nom).toBe('Espresso Martini');
  });

  it('should filter cocktails by search query', () => {
    component.searchQuery.set('coffee');
    expect(component.filteredCocktails()).toHaveSize(1);
    expect(component.filteredCocktails()[0].nom).toBe('Espresso Martini');
  });

  it('should toggle cocktail selection', () => {
    expect(component.isSelected('lib_1')).toBeFalse();
    component.toggleSelection('lib_1');
    expect(component.isSelected('lib_1')).toBeTrue();
    expect(component.selectedCount()).toBe(1);

    component.toggleSelection('lib_1');
    expect(component.isSelected('lib_1')).toBeFalse();
    expect(component.selectedCount()).toBe(0);
  });

  it('should select all filtered cocktails with selectAllVisible()', () => {
    component.selectAllVisible();
    expect(component.selectedCount()).toBe(3);
    expect(component.isSelected('lib_1')).toBeTrue();
    expect(component.isSelected('lib_2')).toBeTrue();
    expect(component.isSelected('lib_3')).toBeTrue();
  });

  it('should select only IBA official cocktails with selectIbaClassics()', () => {
    component.selectIbaClassics();
    expect(component.selectedCount()).toBe(2);
    expect(component.isSelected('lib_1')).toBeTrue();
    expect(component.isSelected('lib_2')).toBeFalse();
    expect(component.isSelected('lib_3')).toBeTrue();
  });

  it('should select only mocktails with selectMocktails()', () => {
    component.selectMocktails();
    expect(component.selectedCount()).toBe(1);
    expect(component.isSelected('lib_2')).toBeTrue();
  });

  it('should deselect all with deselectAll()', () => {
    component.selectAllVisible();
    expect(component.selectedCount()).toBe(3);

    component.deselectAll();
    expect(component.selectedCount()).toBe(0);
  });

  it('should open and close recipe preview drawer', () => {
    const mouseEvent = new MouseEvent('click');
    component.openPreview(mockLibraryItems[0], mouseEvent);
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

    expect(libraryServiceSpy.importCocktails).toHaveBeenCalledWith({
      cocktailIds: ['lib_1']
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(importResult, 'imported');
  });

  it('should handle import error and display error toast', async () => {
    libraryServiceSpy.importCocktails.and.returnValue(throwError(() => new Error('Import failed')));

    component.toggleSelection('lib_1');
    component.executeImport();

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
});
