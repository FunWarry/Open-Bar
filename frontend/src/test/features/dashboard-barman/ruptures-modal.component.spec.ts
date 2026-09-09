import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { RupturesModalComponent } from '../../../app/features/dashboard-barman/components/ruptures-modal/ruptures-modal.component';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('RupturesModalComponent', () => {
  let component: RupturesModalComponent;
  let fixture: ComponentFixture<RupturesModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;

  const mockCocktails: Cocktail[] = [
    {
      id: 1,
      nom: 'Mojito',
      prix: 8.5,
      categorie: 'ALCOOLISE',
      disponible: true,
      saisonnier: false,
      ingredients: [],
      variantes: [],
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 2,
      nom: 'Virgin Colada',
      prix: 6.0,
      categorie: 'SANS_ALCOOL',
      disponible: false,
      saisonnier: false,
      ingredients: [],
      variantes: [],
      createdAt: '',
      updatedAt: ''
    }
  ];

  const mockIngredients: Ingredient[] = [
    {
      id: 1,
      nom: 'Fresh Mint',
      uniteMesure: 'g',
      quantiteStock: 100,
      seuilAlerte: 20,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 2,
      nom: 'Rhum Blanc',
      uniteMesure: 'cl',
      quantiteStock: 5,
      seuilAlerte: 10,
      createdAt: '',
      updatedAt: ''
    }
  ];

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    const childModalSpy = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(
        Promise.resolve({ role: 'saved', data: { movement: { quantity: 10 } } })
      )
    };
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss', 'create']);
    modalCtrlSpy.create.and.returnValue(Promise.resolve(childModalSpy as any));
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', [
      'getCocktails',
      'getIngredients',
      'toggleCocktailDisponibilite',
      'updateIngredientStock',
      'getCocktailsByIngredient'
    ]);
    dashboardServiceSpy.getCocktails.and.returnValue(of(mockCocktails));
    dashboardServiceSpy.getIngredients.and.returnValue(of(mockIngredients));
    dashboardServiceSpy.toggleCocktailDisponibilite.and.returnValue(
      of({ ...mockCocktails[0], disponible: false })
    );
    dashboardServiceSpy.updateIngredientStock.and.returnValue(
      of({ ...mockIngredients[0], quantiteStock: 0 })
    );
    dashboardServiceSpy.getCocktailsByIngredient.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RupturesModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RupturesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component and load data', () => {
    expect(component).toBeTruthy();
    expect(component.cocktails).toHaveSize(2);
    expect(component.ingredients).toHaveSize(2);
  });

  it('displays an error toast if loading fails', () => {
    dashboardServiceSpy.getCocktails.and.returnValue(throwError(() => new Error('API Error')));
    component.loadData();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('calcule correctement les compteurs de ruptures', () => {
    expect(component.outOfStockCocktailsCount).toBe(1);
    expect(component.outOfStockIngredientsCount).toBe(1);
  });

  it('filtre les cocktails et ingredients par recherche', () => {
    component.searchQuery = 'mojito';
    expect(component.filteredCocktails).toHaveSize(1);
    expect(component.filteredCocktails[0].nom).toBe('Mojito');

    component.searchQuery = 'mint';
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Fresh Mint');
  });

  it('clears searchQuery when switching tabs via onTabChange()', () => {
    component.searchQuery = 'mojito';
    component.onTabChange();
    expect(component.searchQuery).toBe('');
  });

  it('toggleCocktail() bascule la disponibilite et displays a toast', () => {
    const cocktail = component.cocktails[0];
    component.toggleCocktail(cocktail);

    expect(dashboardServiceSpy.toggleCocktailDisponibilite).toHaveBeenCalledWith(cocktail.id);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('toggleCocktail() rolls back state on API error', () => {
    const cocktail = component.cocktails[0];
    const originalDispo = cocktail.disponible;
    dashboardServiceSpy.toggleCocktailDisponibilite.and.returnValue(
      throwError(() => new Error('API Error'))
    );

    component.toggleCocktail(cocktail);
    expect(cocktail.disponible).toBe(originalDispo);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('updateStock() updates positive stock directly', () => {
    const ingredient = component.ingredients[0];
    component.updateStock(ingredient, 50);

    expect(dashboardServiceSpy.updateIngredientStock).toHaveBeenCalledWith(ingredient.id, 50);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('updateStock() zeroes stock directly when no cocktails use the ingredient', () => {
    dashboardServiceSpy.getCocktailsByIngredient.and.returnValue(of([]));
    const ingredient = component.ingredients[0];
    component.updateStock(ingredient, 0);

    expect(dashboardServiceSpy.getCocktailsByIngredient).toHaveBeenCalledWith(ingredient.id);
    expect(dashboardServiceSpy.updateIngredientStock).toHaveBeenCalledWith(ingredient.id, 0);
  });

  it('updateStock() opens RuptureImpactModalComponent when cocktails use the ingredient', async () => {
    dashboardServiceSpy.getCocktailsByIngredient.and.returnValue(of(mockCocktails));
    const ingredient = component.ingredients[0];
    component.updateStock(ingredient, 0);

    expect(dashboardServiceSpy.getCocktailsByIngredient).toHaveBeenCalledWith(ingredient.id);
    expect(modalCtrlSpy.create).toHaveBeenCalled();
  });

  it('dismiss() ferme la modale', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalled();
  });

  it('openWasteModal() opens StockWasteModalComponent and deducts quantity from ingredient', async () => {
    const ingredient = { ...mockIngredients[0], quantiteStock: 50 };
    await component.openWasteModal(ingredient);
    expect(modalCtrlSpy.create).toHaveBeenCalled();
    // 50 - 10 = 40
    expect(ingredient.quantiteStock).toBe(40);
  });

  it('updateStock() falls back to executeStockUpdate when getCocktailsByIngredient throws error', () => {
    dashboardServiceSpy.getCocktailsByIngredient.and.returnValue(throwError(() => new Error('Network error')));
    const ingredient = component.ingredients[0];
    component.updateStock(ingredient, 0);

    expect(dashboardServiceSpy.updateIngredientStock).toHaveBeenCalledWith(ingredient.id, 0);
  });

  it('openRuptureImpactModal() marks cocktails as unavailable and zeroes ingredient stock when cascaded', async () => {
    const ingredient = { ...mockIngredients[0], quantiteStock: 50 };
    component.cocktails = [{ ...mockCocktails[0], disponible: true }];
    const modalWithCascade = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(
        Promise.resolve({ data: { action: 'cascaded', cocktailIds: [1] } })
      )
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalWithCascade as any));

    await component.openRuptureImpactModal(ingredient, mockCocktails);

    expect(ingredient.quantiteStock).toBe(0);
    expect(component.cocktails[0].disponible).toBeFalse();
  });

  it('openRuptureImpactModal() zeroes ingredient stock when dismissed with ingredient_only', async () => {
    const ingredient = { ...mockIngredients[0], quantiteStock: 50 };
    const modalWithIngredientOnly = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(
        Promise.resolve({ data: { action: 'ingredient_only' } })
      )
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalWithIngredientOnly as any));

    await component.openRuptureImpactModal(ingredient, mockCocktails);

    expect(ingredient.quantiteStock).toBe(0);
  });

  it('openRuptureImpactModal() updates ingredient stock when dismissed with restocked', async () => {
    const ingredient = { ...mockIngredients[0], quantiteStock: 0 };
    const modalWithRestocked = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(
        Promise.resolve({ data: { action: 'restocked', newStock: 25 } })
      )
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalWithRestocked as any));

    await component.openRuptureImpactModal(ingredient, mockCocktails);

    expect(ingredient.quantiteStock).toBe(25);
  });
});
