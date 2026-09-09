import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { StockWasteModalComponent } from '../../../app/features/ingredients/stock-waste-modal/stock-waste-modal.component';
import { StockWasteService } from '../../../app/core/services/stock-waste.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { Ingredient } from '../../../app/core/models/ingredient.model';
import { getTranslocoTestingModule } from '../../transloco-testing.module';

describe('StockWasteModalComponent', () => {
  let component: StockWasteModalComponent;
  let fixture: ComponentFixture<StockWasteModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let stockWasteServiceSpy: jasmine.SpyObj<StockWasteService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

  const mockIngredient: Ingredient = {
    id: 10,
    nom: 'Rhum Blanc',
    quantiteStock: 50,
    seuilAlerte: 10,
    uniteMesure: 'cl',
    prixUnitaire: 0.20,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
  };

  const mockIngredientList: Ingredient[] = [
    mockIngredient,
    {
      id: 20,
      nom: 'Menthe Fraîche',
      quantiteStock: 15,
      seuilAlerte: 5,
      uniteMesure: 'g',
      prixUnitaire: 0.10,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }
  ];

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalCtrlSpy.dismiss.and.returnValue(Promise.resolve(true));

    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    const toastElementSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastElementSpy.present.and.returnValue(Promise.resolve());
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastElementSpy));

    stockWasteServiceSpy = jasmine.createSpyObj('StockWasteService', ['recordWaste']);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getAll']);
    ingredientServiceSpy.getAll.and.returnValue(of(mockIngredientList));

    await TestBed.configureTestingModule({
      imports: [
        StockWasteModalComponent,
        FormsModule,
        getTranslocoTestingModule(),
        IonicModule.forRoot()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: StockWasteService, useValue: stockWasteServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setupComponent(inputs?: { ingredient?: Ingredient; preselectedIngredientId?: number }): void {
    fixture = TestBed.createComponent(StockWasteModalComponent);
    component = fixture.componentInstance;
    if (inputs?.ingredient) {
      component.ingredient = inputs.ingredient;
    }
    if (inputs?.preselectedIngredientId) {
      component.preselectedIngredientId = inputs.preselectedIngredientId;
    }
    fixture.detectChanges();
  }

  it('should create component and initialize with preselected ingredient input', () => {
    setupComponent({ ingredient: mockIngredient });
    expect(component).toBeTruthy();
    expect(component.selectedIngredient?.id).toBe(10);
    expect(component.currentStock).toBe(50);
    expect(component.currentUnit).toBe('cl');
    expect(component.unitCost).toBe(0.20);
  });

  it('should fallback to ingredientService.getAll() if no ingredient is provided', () => {
    setupComponent();
    expect(ingredientServiceSpy.getAll).toHaveBeenCalled();
    expect(component.availableIngredients).toHaveSize(2);
  });

  it('should auto-select ingredient when preselectedIngredientId is supplied', () => {
    setupComponent({ preselectedIngredientId: 20 });
    expect(component.selectedIngredient?.id).toBe(20);
    expect(component.currentStock).toBe(15);
  });

  it('should calculate estimated loss correctly based on unit price and quantity', () => {
    setupComponent({ ingredient: mockIngredient });
    component.quantity = 5;
    // 5 * 0.20 = 1.00
    expect(component.estimatedCost).toBe(1.00);

    component.quantity = 0;
    expect(component.estimatedCost).toBe(0);
  });

  it('should flag isQuantityExceedingStock as true when quantity exceeds current stock', () => {
    setupComponent({ ingredient: mockIngredient });
    component.quantity = 60; // Available is 50
    expect(component.isQuantityExceedingStock).toBeTrue();
    expect(component.isValid).toBeFalse();

    component.quantity = 25;
    expect(component.isQuantityExceedingStock).toBeFalse();
    expect(component.isValid).toBeTrue();
  });

  it('should consider form invalid when quantity is null or <= 0', () => {
    setupComponent({ ingredient: mockIngredient });
    component.quantity = null;
    expect(component.isValid).toBeFalse();

    component.quantity = 0;
    expect(component.isValid).toBeFalse();

    component.quantity = -2;
    expect(component.isValid).toBeFalse();
  });

  it('should record waste successfully and dismiss modal on submit', () => {
    setupComponent({ ingredient: mockIngredient });
    component.quantity = 4;
    component.reason = 'CASSE';
    component.notes = 'Accidental spill';

    stockWasteServiceSpy.recordWaste.and.returnValue(of({
      id: 99,
      ingredientId: 10,
      ingredientNom: 'Rhum Blanc',
      quantity: 4,
      unit: 'cl',
      reason: 'CASSE',
      reportedByUsername: 'barman',
      notes: 'Accidental spill',
      cost: 0.80,
      recordedAt: '2026-09-06T15:00:00Z'
    }));

    component.submit();

    expect(stockWasteServiceSpy.recordWaste).toHaveBeenCalledWith({
      ingredientId: 10,
      quantity: 4,
      reason: 'CASSE',
      notes: 'Accidental spill'
    });
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should handle error when recordWaste fails and present error toast', () => {
    setupComponent({ ingredient: mockIngredient });
    component.quantity = 2;
    component.reason = 'PEREMPTION';
    component.notes = 'Out of date';

    stockWasteServiceSpy.recordWaste.and.returnValue(
      throwError(() => ({ status: 400, error: { message: 'Stock error' } }))
    );

    component.submit();

    expect(stockWasteServiceSpy.recordWaste).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  });

  it('should dismiss modal on cancel', () => {
    setupComponent({ ingredient: mockIngredient });
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should update selected ingredient when onIngredientChange is triggered', () => {
    setupComponent();
    component.onIngredientChange({ detail: { value: 20 } });
    expect(component.selectedIngredient?.id).toBe(20);
    expect(component.currentStock).toBe(15);
  });

  it('should not call recordWaste when submit is invoked with invalid form', () => {
    setupComponent({ ingredient: mockIngredient });
    component.quantity = null;
    component.submit();
    expect(stockWasteServiceSpy.recordWaste).not.toHaveBeenCalled();
  });

  it('should set isLoadingIngredients to false when loadIngredients fails', () => {
    ingredientServiceSpy.getAll.and.returnValue(throwError(() => new Error('Network error')));
    setupComponent();
    expect(component.isLoadingIngredients).toBeFalse();
  });

  describe('StockWasteModalComponent extended UX features', () => {
    it('ingredientOptions should format options with danger badge when stock <= threshold', () => {
      setupComponent();
      const options = component.ingredientOptions;
      expect(options).toHaveSize(2);

      // mockIngredient has stock 50, seuil 10 -> neutral
      const rh = options.find(o => o.value === 10);
      expect(rh?.badgeType).toBe('neutral');

      // Menthe has stock 15, seuil 5 -> neutral. If seuil is 20 -> danger
      component.availableIngredients[1].seuilAlerte = 20;
      const menthe = component.ingredientOptions.find(o => o.value === 20);
      expect(menthe?.badgeType).toBe('danger');
    });

    it('selectReason should update waste reason', () => {
      setupComponent({ ingredient: mockIngredient });
      component.selectReason('PEREMPTION');
      expect(component.reason).toBe('PEREMPTION');
    });

    it('setQuantityPercentage should calculate quantity based on stock percentage', () => {
      setupComponent({ ingredient: mockIngredient }); // stock = 50
      component.setQuantityPercentage(50);
      expect(component.quantity).toBe(25);

      component.setQuantityPercentage(25);
      expect(component.quantity).toBe(12.5);

      component.setQuantityPercentage(100);
      expect(component.quantity).toBe(50);
    });

    it('setQuantityPercentage should do nothing if no ingredient is selected or stock is 0', () => {
      setupComponent();
      component.selectedIngredient = null;
      component.setQuantityPercentage(50);
      expect(component.quantity).toBeNull();

      component.selectedIngredient = { ...mockIngredient, quantiteStock: 0 };
      component.setQuantityPercentage(50);
      expect(component.quantity).toBeNull();
    });

    it('remainingStock should return 0 if no ingredient is selected', () => {
      setupComponent();
      component.selectedIngredient = null;
      expect(component.remainingStock).toBe(0);
    });

    it('remainingStock should compute remaining stock correctly and clamp to 0', () => {
      setupComponent({ ingredient: mockIngredient }); // stock = 50
      component.quantity = 15;
      expect(component.remainingStock).toBe(35);

      component.quantity = 60;
      expect(component.remainingStock).toBe(0);
    });

    it('onIngredientChange should accept direct number id', () => {
      setupComponent();
      component.onIngredientChange(20);
      expect(component.selectedIngredientId).toBe(20);
      expect(component.selectedIngredient?.nom).toBe('Menthe Fraîche');
    });
  });
});
