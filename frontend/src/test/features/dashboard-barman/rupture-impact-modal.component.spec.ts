import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';
import { RuptureImpactModalComponent } from '../../../app/features/dashboard-barman/components/rupture-impact-modal/rupture-impact-modal.component';
import { DashboardBarmanService } from '../../../app/features/dashboard-barman/services/dashboard-barman.service';
import { Cocktail } from '../../../app/core/models/cocktail.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('RuptureImpactModalComponent', () => {
  let component: RuptureImpactModalComponent;
  let fixture: ComponentFixture<RuptureImpactModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardBarmanService>;

  const mockIngredient: Ingredient = {
    id: 1,
    nom: 'Fresh Mint',
    uniteMesure: 'g',
    quantiteStock: 10,
    seuilAlerte: 20,
    createdAt: '',
    updatedAt: ''
  };

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
      nom: 'Virgin Mojito',
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

  const mockToast = { present: jasmine.createSpy('present').and.returnValue(Promise.resolve()) };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    dashboardServiceSpy = jasmine.createSpyObj('DashboardBarmanService', [
      'getCocktailsByIngredient',
      'updateIngredientStock',
      'setCocktailsDisponibiliteBatch'
    ]);
    dashboardServiceSpy.getCocktailsByIngredient.and.returnValue(of(mockCocktails));
    dashboardServiceSpy.updateIngredientStock.and.returnValue(of({ ...mockIngredient, quantiteStock: 0 }));
    dashboardServiceSpy.setCocktailsDisponibiliteBatch.and.returnValue(of(mockCocktails));

    await TestBed.configureTestingModule({
      imports: [RuptureImpactModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: DashboardBarmanService, useValue: dashboardServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RuptureImpactModalComponent);
    component = fixture.componentInstance;
    component.ingredient = { ...mockIngredient };
  });

  it('should create and load cocktails if not provided', () => {
    component.affectedCocktails = [];
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(dashboardServiceSpy.getCocktailsByIngredient).toHaveBeenCalledWith(1);
    expect(component.affectedCocktails).toHaveSize(2);
    // Only available cocktail (id: 1) should be selected by default
    expect(component.isSelected(1)).toBeTrue();
    expect(component.isSelected(2)).toBeFalse();
  });

  it('should use provided affected cocktails without fetching', () => {
    component.affectedCocktails = [...mockCocktails];
    fixture.detectChanges();

    expect(dashboardServiceSpy.getCocktailsByIngredient).not.toHaveBeenCalled();
    expect(component.isSelected(1)).toBeTrue();
    expect(component.isSelected(2)).toBeFalse();
  });

  it('should toggle selection for cocktails and handle selectAll / deselectAll', () => {
    component.affectedCocktails = [...mockCocktails];
    fixture.detectChanges();

    expect(component.isSelected(1)).toBeTrue();
    component.toggleCocktailSelection(1);
    expect(component.isSelected(1)).toBeFalse();
    component.toggleCocktailSelection(1);
    expect(component.isSelected(1)).toBeTrue();

    component.deselectAll();
    expect(component.selectedCocktailIds.size).toBe(0);

    component.selectAll();
    expect(component.isSelected(1)).toBeTrue();
  });

  it('should restock ingredient and dismiss modal with restocked action', fakeAsync(() => {
    component.quickRestockQty = 50;
    dashboardServiceSpy.updateIngredientStock.and.returnValue(of({ ...mockIngredient, quantiteStock: 50 }));

    component.applyQuickRestock();
    tick();

    expect(dashboardServiceSpy.updateIngredientStock).toHaveBeenCalledWith(1, 50);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'restocked', newStock: 50 });
  }));

  it('should not restock if quantity is null or zero', () => {
    component.quickRestockQty = 0;
    component.applyQuickRestock();
    expect(dashboardServiceSpy.updateIngredientStock).not.toHaveBeenCalled();

    component.quickRestockQty = null;
    component.applyQuickRestock();
    expect(dashboardServiceSpy.updateIngredientStock).not.toHaveBeenCalled();
  });

  it('should confirm cascade with batch cocktail update and stock zeroing', fakeAsync(() => {
    component.ingredient.quantiteStock = 10;
    component.affectedCocktails = [...mockCocktails];
    component.selectedCocktailIds = new Set([1]);

    component.confirmCascade();
    tick();

    expect(dashboardServiceSpy.updateIngredientStock).toHaveBeenCalledWith(1, 0);
    expect(dashboardServiceSpy.setCocktailsDisponibiliteBatch).toHaveBeenCalledWith([1], false);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'cascaded', cocktailIds: [1] });
  }));

  it('should keep cocktails available and only zero ingredient stock', fakeAsync(() => {
    component.ingredient.quantiteStock = 10;

    component.keepCocktailsAvailable();
    tick();

    expect(dashboardServiceSpy.updateIngredientStock).toHaveBeenCalledWith(1, 0);
    expect(dashboardServiceSpy.setCocktailsDisponibiliteBatch).not.toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'ingredient_only' });
  }));

  it('should dismiss modal on dismiss call', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'cancel' });
  });

  it('should handle error when loading cocktails fails', () => {
    dashboardServiceSpy.getCocktailsByIngredient.and.returnValue(throwError(() => new Error('Network error')));
    component.affectedCocktails = [];
    component.loadAffectedCocktails();

    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });
});
