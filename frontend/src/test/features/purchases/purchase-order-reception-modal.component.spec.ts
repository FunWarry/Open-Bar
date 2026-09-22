import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { PurchaseOrderReceptionModalComponent } from '../../../app/features/purchases/purchase-order-reception-modal/purchase-order-reception-modal.component';
import { PurchaseOrderService } from '../../../app/core/services/purchase-order.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { PurchaseOrder, PriceVariation } from '../../../app/core/models/purchase-order.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';

describe('PurchaseOrderReceptionModalComponent', () => {
  let component: PurchaseOrderReceptionModalComponent;
  let fixture: ComponentFixture<PurchaseOrderReceptionModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let purchaseOrderServiceSpy: jasmine.SpyObj<PurchaseOrderService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

  const mockOrder: PurchaseOrder = {
    id: 10,
    numeroCommande: 'CMD-2026-001',
    supplierId: 1,
    supplierNom: 'Distillerie des Alpes',
    status: 'ORDERED',
    dateCommande: '2026-09-20T10:00:00',
    totalHt: 200,
    totalTva: 40,
    totalTtc: 240,
    items: [
      {
        id: 101,
        ingredientId: 10,
        ingredientNom: 'Rhum Blanc',
        ingredientUnite: 'Bouteille',
        quantiteCommandee: 5,
        quantiteRecue: 0,
        prixUnitaireHt: 20,
        tauxTva: 20,
        montantHt: 100,
        montantTtc: 120
      },
      {
        id: 102,
        ingredientId: 20,
        ingredientNom: 'Gin',
        ingredientUnite: 'Bouteille',
        quantiteCommandee: 5,
        quantiteRecue: 2,
        prixUnitaireHt: 20,
        tauxTva: 20,
        montantHt: 100,
        montantTtc: 120
      }
    ]
  };

  const mockVariations: PriceVariation[] = [
    {
      ingredientId: 10,
      ingredientNom: 'Rhum Blanc',
      ancienPamp: 18.0,
      nouveauPamp: 19.5,
      dernierPrixAchat: 20.0,
      variationPourcentage: 8.33,
      alerteHausse: true
    }
  ];

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    purchaseOrderServiceSpy = jasmine.createSpyObj('PurchaseOrderService', ['receive']);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getByBarcode']);

    const toastSpyObj = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpyObj));

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderReceptionModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: PurchaseOrderService, useValue: purchaseOrderServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderReceptionModalComponent);
    component = fixture.componentInstance;
    component.order = mockOrder;
    fixture.detectChanges();
  });

  it('should initialize form with order items and calculate remaining quantities', () => {
    expect(component.form).toBeDefined();
    expect(component.items).toHaveSize(2);
    // Item 1 remaining: 5 - 0 = 5
    expect(component.items.at(0).get('quantiteLivree')?.value).toBe(5);
    // Item 2 remaining: 5 - 2 = 3
    expect(component.items.at(1).get('quantiteLivree')?.value).toBe(3);
  });

  it('onSubmit() marks form as touched if invalid', () => {
    component.form.get('numeroBonLivraison')?.setValue('');
    component.onSubmit();
    expect(purchaseOrderServiceSpy.receive).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('onSubmit() warns if no items have quantiteLivree > 0', () => {
    component.form.get('numeroBonLivraison')?.setValue('BL-2026-001');
    component.items.at(0).get('quantiteLivree')?.setValue(0);
    component.items.at(1).get('quantiteLivree')?.setValue(0);

    component.onSubmit();
    expect(purchaseOrderServiceSpy.receive).not.toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'warning'
    }));
  });

  it('onSubmit() sends reception request and records price variations', () => {
    purchaseOrderServiceSpy.receive.and.returnValue(of(mockVariations));
    component.form.get('numeroBonLivraison')?.setValue('BL-2026-001');
    component.form.get('notes')?.setValue('Clean delivery');

    component.onSubmit();

    expect(purchaseOrderServiceSpy.receive).toHaveBeenCalledWith(10, jasmine.objectContaining({
      numeroBonLivraison: 'BL-2026-001',
      notes: 'Clean delivery',
      receptions: jasmine.any(Array)
    }));
    expect(component.priceVariations()).toEqual(mockVariations);
    expect(component.isSubmitting()).toBeFalse();
  });

  it('onSubmit() displays error toast if receive fails', () => {
    purchaseOrderServiceSpy.receive.and.returnValue(throwError(() => ({
      error: { message: 'Stock update error' }
    })));
    component.form.get('numeroBonLivraison')?.setValue('BL-2026-001');

    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger',
      message: 'Stock update error'
    }));
  });

  it('closeWithSuccess() dismisses modal with confirmed true and variations', () => {
    component.priceVariations.set(mockVariations);
    component.closeWithSuccess();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({
      confirmed: true,
      variations: mockVariations
    });
  });

  it('onCancel() dismisses modal without confirming', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: false });
  });

  it('openBarcodeScanner() increments quantiteLivree when matching ingredient scanned', async () => {
    const scannedIngredient: Ingredient = {
      id: 10,
      nom: 'Rhum Blanc',
      quantiteStock: 10,
      seuilAlerte: 2,
      uniteMesure: 'Bouteille',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    };
    ingredientServiceSpy.getByBarcode.and.returnValue(of(scannedIngredient));

    const subModalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    subModalSpy.present.and.returnValue(Promise.resolve());
    subModalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { barcode: '3256220148521', cancelled: false }
    }));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(subModalSpy));

    expect(component.items.at(0).get('quantiteLivree')?.value).toBe(5);

    await component.openBarcodeScanner();

    expect(ingredientServiceSpy.getByBarcode).toHaveBeenCalledWith('3256220148521');
    expect(component.items.at(0).get('quantiteLivree')?.value).toBe(6);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('openBarcodeScanner() warns when scanned ingredient is not in order', async () => {
    const foreignIngredient: Ingredient = {
      id: 99,
      nom: 'Inconnu',
      quantiteStock: 1,
      seuilAlerte: 1,
      uniteMesure: 'L',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    };
    ingredientServiceSpy.getByBarcode.and.returnValue(of(foreignIngredient));

    const subModalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    subModalSpy.present.and.returnValue(Promise.resolve());
    subModalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { barcode: '1111111111111', cancelled: false }
    }));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(subModalSpy));

    await component.openBarcodeScanner();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'warning'
    }));
  });
});
