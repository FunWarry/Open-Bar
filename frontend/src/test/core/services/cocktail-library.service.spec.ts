import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CocktailLibraryService } from '../../../app/core/services/cocktail-library.service';
import { environment } from '../../../environments/environment';
import { CocktailLibraryItem, CocktailLibraryImportResult } from '../../../app/core/models/cocktail-library.model';

describe('CocktailLibraryService', () => {
  let service: CocktailLibraryService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/cocktails/library`;

  const mockItem: CocktailLibraryItem = {
    id: 'lib_1',
    nom: 'Mojito',
    description: 'Classic Cuban recipe',
    categorie: 'ALCOOLISE',
    libraryCategory: 'IBA_CLASSICS',
    baseSpirit: 'RUM',
    ibaOfficial: true,
    prix: 9.5,
    alcoholLevel: 12,
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
    instructions: 'Muddle and stir'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CocktailLibraryService]
    });
    service = TestBed.inject(CocktailLibraryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch library cocktails with no query params', () => {
    service.getLibraryCocktails().subscribe((items: CocktailLibraryItem[]) => {
      expect(items).toEqual([mockItem]);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toHaveSize(0);
    req.flush([mockItem]);
  });

  it('should set appropriate query parameters when filtering', () => {
    service.getLibraryCocktails({
      category: 'IBA_CLASSICS',
      baseSpirit: 'RUM',
      flavor: 'SOUR',
      mocktail: false,
      search: 'mojito'
    }).subscribe((items: CocktailLibraryItem[]) => {
      expect(items).toHaveSize(1);
    });

    const req = httpMock.expectOne(request =>
      request.url === baseUrl &&
      request.params.get('category') === 'IBA_CLASSICS' &&
      request.params.get('baseSpirit') === 'RUM' &&
      request.params.get('flavor') === 'SOUR' &&
      request.params.get('mocktail') === 'false' &&
      request.params.get('search') === 'mojito'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockItem]);
  });

  it('should send POST request to import selected cocktails', () => {
    const importPayload = {
      cocktailIds: ['lib_1', 'lib_2']
    };
    const mockResult: CocktailLibraryImportResult = {
      importedCount: 2,
      skippedCount: 0,
      newIngredientsCount: 6,
      reusedIngredientsCount: 1,
      importedCocktails: ['Mojito', 'Daiquiri'],
      skippedCocktails: [],
      message: '2 cocktails imported successfully.'
    };

    service.importCocktails(importPayload).subscribe(result => {
      expect(result.importedCount).toBe(2);
      expect(result.importedCocktails).toEqual(['Mojito', 'Daiquiri']);
    });

    const req = httpMock.expectOne(`${baseUrl}/import`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(importPayload);
    req.flush(mockResult);
  });

  it('should fetch and cache connection wheel data from assets', () => {
    const mockWheelData: any = {
      nodes: [{ id: 'ing_1', name: 'Rhum' }],
      edges: [{ source: 'ing_1', target: 'ing_2', weight: 5 }],
      categories: ['dark_liquor']
    };

    let result1: any;
    let result2: any;

    service.getWheelData().subscribe(data => result1 = data);
    service.getWheelData().subscribe(data => result2 = data);

    const req = httpMock.expectOne('assets/data/cocktail-connection-wheel.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockWheelData);

    expect(result1).toEqual(mockWheelData);
    expect(result2).toEqual(mockWheelData);
    httpMock.expectNone(`${baseUrl}/wheel`);
  });

  it('should fall back to backend API if connection wheel asset request fails', () => {
    const mockWheelData: any = {
      nodes: [{ id: 'ing_fallback', name: 'Gin' }],
      edges: [],
      categories: ['light_liquor']
    };

    let fallbackResult: any;
    service.getWheelData().subscribe(data => fallbackResult = data);

    const assetReq = httpMock.expectOne('assets/data/cocktail-connection-wheel.json');
    assetReq.flush('Not Found', { status: 404, statusText: 'Not Found' });

    const apiReq = httpMock.expectOne(`${baseUrl}/wheel`);
    expect(apiReq.request.method).toBe('GET');
    apiReq.flush(mockWheelData);

    expect(fallbackResult).toEqual(mockWheelData);
  });
});
