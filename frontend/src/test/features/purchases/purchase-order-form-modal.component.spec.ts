import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { PurchaseOrderFormModalComponent } from '../../../app/features/purchases/purchase-order-form-modal/purchase-order-form-modal.component';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { Supplier } from '../../../app/core/models/supplier.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';

describe('PurchaseOrderFormModalComponent', () => {
  let component: PurchaseOrderFormModalComponent;
  let fixture: ComponentFixture<PurchaseOrderFormModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

  const mockSuppliers: Supplier[] = [
    { id: 1, nom: 'Distillerie des Alpes', actif: true },
    { id: 2, nom: 'Grossiste Boissons Rhône', actif: true }
  ];

  const mockIngredients: Ingredient[] = [
    {
      id: 10,
      nom: 'Rhum Blanc',
      quantiteStock: 5,
      seuilAlerte: 2,
      unitCost: 18.5,
      uniteMesure: 'Bouteille',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 20,
      nom: 'Gin',
      quantiteStock: 3,
      seuilAlerte: 1,
      unitCost: 22.0,
      uniteMesure: 'Bouteille',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getByBarcode']);

    const toastSpyObj = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpyObj));

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderFormModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderFormModalComponent);
    component = fixture.componentInstance;
    component.suppliers = mockSuppliers;
    component.ingredients = mockIngredients;
    fixture.detectChanges();
  });

  it('should initialize form with default values and 1 item row', () => {
    expect(component.form).toBeDefined();
    expect(component.form.get('supplierId')?.value).toBe(1);
    expect(component.items).toHaveSize(1);
  });

  it('addItem() adds a new line item to the form', () => {
    component.addItem(20, 22.0, 20);
    expect(component.items).toHaveSize(2);
    expect(component.items.at(1).get('ingredientId')?.value).toBe(20);
    expect(component.items.at(1).get('prixUnitaireHt')?.value).toBe(22.0);
  });

  it('removeItem() removes a line item when more than 1 exist', () => {
    component.addItem(20, 22.0, 20);
    expect(component.items).toHaveSize(2);

    component.removeItem(0);
    expect(component.items).toHaveSize(1);

    // Should not remove last item
    component.removeItem(0);
    expect(component.items).toHaveSize(1);
  });

  it('onIngredientSelected() updates prixUnitaireHt from ingredient unitCost', () => {
    component.onIngredientSelected(0, 10);
    expect(component.items.at(0).get('prixUnitaireHt')?.value).toBe(18.5);
  });

  it('calculates totalHt, totalTva and totalTtc correctly', () => {
    component.items.at(0).patchValue({
      ingredientId: 10,
      quantiteCommandee: 2,
      prixUnitaireHt: 50,
      tauxTva: 20
    });

    expect(component.totalHt).toBe(100);
    expect(component.totalTva).toBe(20);
    expect(component.totalTtc).toBe(120);
  });

  it('onSubmit() marks form as touched if invalid', () => {
    component.items.at(0).patchValue({ ingredientId: '' });
    component.onSubmit();
    expect(modalCtrlSpy.dismiss).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('onSubmit() dismisses with payload when form is valid', () => {
    component.form.patchValue({
      supplierId: 1,
      dateLivraisonPrevue: '2026-09-25T00:00:00.000Z',
      referenceFactureFournisseur: 'FA-1234',
      notes: 'Urgent order'
    });
    component.items.at(0).patchValue({
      ingredientId: 10,
      quantiteCommandee: 2,
      prixUnitaireHt: 18.5,
      tauxTva: 20
    });

    component.onSubmit();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      confirmed: true,
      order: jasmine.objectContaining({
        supplierId: 1,
        referenceFactureFournisseur: 'FA-1234',
        notes: 'Urgent order'
      })
    }));
  });

  it('onCancel() dismisses modal without confirming', () => {
    component.onCancel();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ confirmed: false });
  });

  it('openBarcodeScanner() increments quantity when ingredient already present', async () => {
    ingredientServiceSpy.getByBarcode.and.returnValue(of(mockIngredients[0]));

    const subModalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    subModalSpy.present.and.returnValue(Promise.resolve());
    subModalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { barcode: '3256220148521', cancelled: false }
    }));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(subModalSpy));

    component.items.at(0).patchValue({
      ingredientId: 10,
      quantiteCommandee: 1,
      prixUnitaireHt: 18.5
    });

    await component.openBarcodeScanner();

    expect(ingredientServiceSpy.getByBarcode).toHaveBeenCalledWith('3256220148521');
    expect(component.items.at(0).get('quantiteCommandee')?.value).toBe(2);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('openBarcodeScanner() displays warning toast if barcode not found', async () => {
    ingredientServiceSpy.getByBarcode.and.returnValue(throwError(() => new Error('Not found')));

    const subModalSpy = jasmine.createSpyObj('HTMLIonModalElement', ['present', 'onWillDismiss']);
    subModalSpy.present.and.returnValue(Promise.resolve());
    subModalSpy.onWillDismiss.and.returnValue(Promise.resolve({
      data: { barcode: '9999999999999', cancelled: false }
    }));
    modalCtrlSpy.create.and.returnValue(Promise.resolve(subModalSpy));

    await component.openBarcodeScanner();

    expect(toastCtrlSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'warning'
    }));
  });
});
