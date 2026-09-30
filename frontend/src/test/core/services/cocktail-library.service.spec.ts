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
    localStorage.removeItem('openbar_cocktail_wheel_library');
    localStorage.removeItem('openbar_cocktail_wheel_establishment');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('openbar_cocktail_wheel_library');
    localStorage.removeItem('openbar_cocktail_wheel_establishment');
  });

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

  it('should fetch and cache connection wheel data from backend API with scope', () => {
    const mockWheelData: any = {
      categories: {
        dark_liquor: { label: 'Dark liquor', labelFr: 'Spiritueux bruns', short: 'Dark', shortFr: 'Bruns', color: '#7e3b34' }
      },
      nodes: [{ id: 'ing_1', label: 'Rhum', group: 'dark_liquor', sourceIndex: 0, count: 1 }],
      edges: [{ a: 'ing_1', b: 'ing_2', count: 5 }]
    };

    let result: any;
    service.getWheelData('LIBRARY').subscribe(data => result = data);

    const req = httpMock.expectOne(`${baseUrl}/wheel?scope=LIBRARY`);
    expect(req.request.method).toBe('GET');
    req.flush(mockWheelData);

    expect(result).toEqual(mockWheelData);
    expect(service.getCachedWheelData('LIBRARY')).toEqual(mockWheelData);
  });

  it('should fall back to local assets if backend API fails for LIBRARY scope', () => {
    const mockWheelData: any = {
      categories: {
        light_liquor: { label: 'Light liquor', labelFr: 'Spiritueux blancs', short: 'Light', shortFr: 'Blancs', color: '#b5705c' }
      },
      nodes: [{ id: 'ing_fallback', label: 'Gin', group: 'light_liquor', sourceIndex: 0, count: 1 }],
      edges: []
    };

    let fallbackResult: any;
    service.getWheelData('LIBRARY').subscribe(data => fallbackResult = data);

    const apiReq = httpMock.expectOne(`${baseUrl}/wheel?scope=LIBRARY`);
    expect(apiReq.request.method).toBe('GET');
    apiReq.flush('Not Found', { status: 404, statusText: 'Not Found' });

    const assetReq = httpMock.expectOne('assets/data/cocktail-connection-wheel.json');
    expect(assetReq.request.method).toBe('GET');
    assetReq.flush(mockWheelData);

    expect(fallbackResult).toEqual(mockWheelData);
  });

  it('should fall back to localStorage cached data if network request fails', () => {
    const cachedData: any = {
      categories: {
        light_liquor: { label: 'Light liquor', labelFr: 'Spiritueux blancs', short: 'Light', shortFr: 'Blancs', color: '#b5705c' }
      },
      nodes: [{ id: 'ing_cached', label: 'Vodka', group: 'light_liquor', sourceIndex: 0, count: 1 }],
      edges: []
    };
    localStorage.setItem('openbar_cocktail_wheel_establishment', JSON.stringify(cachedData));

    let result: any;
    service.getWheelData('ESTABLISHMENT').subscribe(data => result = data);

    const apiReq = httpMock.expectOne(`${baseUrl}/wheel?scope=ESTABLISHMENT`);
    apiReq.flush('Network failure', { status: 0, statusText: 'Unknown Error' });

    expect(result).toEqual(cachedData);
  });
});
