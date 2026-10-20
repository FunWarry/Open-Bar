import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController, ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { QuickWasteLogModalComponent } from '../../../app/features/dashboard-barman/components/quick-waste-log-modal/quick-waste-log-modal.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { StockWasteService } from '../../../app/core/services/stock-waste.service';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { StockMovement } from '../../../app/core/models/stock-waste.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('QuickWasteLogModalComponent', () => {
  let component: QuickWasteLogModalComponent;
  let fixture: ComponentFixture<QuickWasteLogModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;
  let stockWasteServiceSpy: jasmine.SpyObj<StockWasteService>;

  const mockIngredients: Ingredient[] = [
    {
      id: 1,
      nom: 'Gin Tanqueray',
      uniteMesure: 'cl',
      quantiteStock: 50,
      seuilAlerte: 10,
      degreAlcool: 43.1,
      category: 'light_liquor',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 2,
      nom: 'Rhum Diplomatico',
      uniteMesure: 'bouteille',
      quantiteStock: 8,
      seuilAlerte: 2,
      degreAlcool: 40.0,
      category: 'dark_liquor',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 3,
      nom: 'Bière IPA',
      uniteMesure: 'bouteille',
      quantiteStock: 24,
      seuilAlerte: 5,
      degreAlcool: 6.2,
      category: 'wine_beer',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 4,
      nom: 'Jus d Orange',
      uniteMesure: 'L',
      quantiteStock: 12,
      seuilAlerte: 3,
      degreAlcool: 0,
      category: 'juices',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 5,
      nom: 'Sirop de grenadine',
      uniteMesure: 'ml',
      quantiteStock: 800,
      seuilAlerte: 150,
      degreAlcool: 0,
      category: 'mixers',
      createdAt: '',
      updatedAt: ''
    }
  ];

  const mockMovement: StockMovement = {
    id: 101,
    ingredientId: 1,
    ingredientNom: 'Gin Tanqueray',
    quantity: 4,
    unit: 'cl',
    reason: 'ERREUR_PREPARATION',
    reportedByUsername: 'barman1',
    cost: 2.4,
    recordedAt: '2026-10-20T20:00:00Z'
  };

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj<ModalController>('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.resolveTo(true);

    const toastElementSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastElementSpy.present.and.resolveTo();

    toastCtrlSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrlSpy.create.and.resolveTo(toastElementSpy);

    ingredientServiceSpy = jasmine.createSpyObj<IngredientService>('IngredientService', ['getAll']);
    ingredientServiceSpy.getAll.and.returnValue(of(mockIngredients));

    stockWasteServiceSpy = jasmine.createSpyObj<StockWasteService>('StockWasteService', ['quickLog', 'revertQuickLog']);
    stockWasteServiceSpy.quickLog.and.returnValue(of(mockMovement));

    await TestBed.configureTestingModule({
      imports: [QuickWasteLogModalComponent, getTranslocoTestingModule()],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: StockWasteService, useValue: stockWasteServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuickWasteLogModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load ingredients on init', () => {
    expect(component).toBeTruthy();
    expect(ingredientServiceSpy.getAll).toHaveBeenCalled();
    expect(component.availableIngredients).toHaveSize(5);
  });

  it('should filter speed rail items by SPIRITS by default', () => {
    expect(component.selectedCategory).toBe('SPIRITS');
    // Gin (43.1°) and Rhum (40°) match SPIRITS category
    expect(component.filteredIngredients).toHaveSize(2);
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Gin Tanqueray', 'Rhum Diplomatico']);
  });

  it('should switch categories and update filtered list', () => {
    component.setCategory('WINE_BEER');
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Bière IPA');

    component.setCategory('SOFTS');
    expect(component.filteredIngredients).toHaveSize(2);
    expect(component.filteredIngredients.map(i => i.nom)).toEqual(['Jus d Orange', 'Sirop de grenadine']);

    component.setCategory('ALL');
    expect(component.filteredIngredients).toHaveSize(5);
  });

  it('should filter items by search query', () => {
    component.setCategory('ALL');
    component.onSearchChange('rhum');
    expect(component.filteredIngredients).toHaveSize(1);
    expect(component.filteredIngredients[0].nom).toBe('Rhum Diplomatico');
  });

  it('should select an ingredient and set appropriate default dose based on unit', () => {
    const clIngredient = mockIngredients[0]; // cl unit
    component.selectIngredient(clIngredient);
    expect(component.selectedIngredient).toBe(clIngredient);
    expect(component.quantity).toBe(4); // 4 cl default

    const bottleIngredient = mockIngredients[1]; // bouteille unit
    component.selectIngredient(bottleIngredient);
    expect(component.quantity).toBe(1); // 1 bouteille default

    const mlIngredient = mockIngredients[4]; // ml unit
    component.selectIngredient(mlIngredient);
    expect(component.quantity).toBe(40); // 40 ml default
  });

  it('should convert preset doses properly across units (cl, ml, L, bottle)', () => {
    const shotPreset = component.dosePresets.find(p => p.id === 'shot')!; // 2 cl
    const halfBottlePreset = component.dosePresets.find(p => p.id === 'half_bottle')!; // 35 cl
    const fullBottlePreset = component.dosePresets.find(p => p.id === 'full_bottle')!; // 70 cl

    // cl unit
    component.selectIngredient(mockIngredients[0]);
    expect(component.getPresetConvertedQuantity(shotPreset)).toBe(2);
    expect(component.getPresetConvertedQuantity(halfBottlePreset)).toBe(35);
    expect(component.getPresetConvertedQuantity(fullBottlePreset)).toBe(70);

    // ml unit
    component.selectIngredient(mockIngredients[4]);
    expect(component.getPresetConvertedQuantity(shotPreset)).toBe(20);

    // L unit
    component.selectIngredient(mockIngredients[3]);
    expect(component.getPresetConvertedQuantity(shotPreset)).toBe(0.02);

    // Bottle unit
    component.selectIngredient(mockIngredients[1]);
    expect(component.getPresetConvertedQuantity(halfBottlePreset)).toBe(0.5);
    expect(component.getPresetConvertedQuantity(fullBottlePreset)).toBe(1.0);
  });

  it('2-Tap Flow: clicking preset dose calls stockWasteService.quickLog and dismisses with saved movement', () => {
    component.selectIngredient(mockIngredients[0]); // Tap 1
    component.selectReason('CASSE');

    const standardPreset = component.dosePresets.find(p => p.id === 'standard')!; // Tap 2
    component.selectPresetAndSubmit(standardPreset);

    expect(stockWasteServiceSpy.quickLog).toHaveBeenCalledWith({
      ingredientId: 1,
      quantity: 4,
      reason: 'CASSE',
      notes: undefined
    });
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ saved: true, movement: mockMovement }, 'saved');
  });

  it('should toggle custom stepper and allow custom quantity adjustment', () => {
    component.selectIngredient(mockIngredients[0]);
    expect(component.showCustomStepper).toBeFalse();

    component.toggleCustomStepper();
    expect(component.showCustomStepper).toBeTrue();

    component.onQuantityChange(15);
    expect(component.quantity).toBe(15);

    component.submitQuickLog();
    expect(stockWasteServiceSpy.quickLog).toHaveBeenCalledWith(jasmine.objectContaining({
      quantity: 15
    }));
  });

  it('should handle service error gracefully and display error toast', async () => {
    stockWasteServiceSpy.quickLog.and.returnValue(throwError(() => ({ error: { message: 'Stock error' } })));

    component.selectIngredient(mockIngredients[0]);
    component.submitQuickLog();

    expect(component.isSubmitting).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should dismiss modal with null on dismiss()', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should clear selected ingredient and reset custom stepper on clearSelectedIngredient()', () => {
    component.selectIngredient(mockIngredients[0]);
    component.showCustomStepper = true;

    component.clearSelectedIngredient();

    expect(component.selectedIngredient).toBeNull();
    expect(component.showCustomStepper).toBeFalse();
  });

  it('should dismiss modal when clearSelectedIngredient() is called with preselected ingredient', () => {
    component.preselectedIngredient = mockIngredients[0];
    component.selectedIngredient = mockIngredients[0];

    component.clearSelectedIngredient();

    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
