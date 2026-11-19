import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { getTranslocoTestingModule } from '../../../transloco-testing.module';
import { SupplierInvoiceReconcileModalComponent } from '../../../../app/features/purchases/supplier-invoice-reconcile-modal/supplier-invoice-reconcile-modal.component';
import { SupplierInvoiceService } from '../../../../app/core/services/supplier-invoice.service';
import { IngredientService } from '../../../../app/core/services/ingredient.service';
import {
  SupplierInvoice,
  SupplierInvoiceReconciliation,
  ReconciliationLineDiff
} from '../../../../app/core/models/supplier-invoice.model';
import { Ingredient } from '../../../../app/core/models/ingredient.model';

describe('SupplierInvoiceReconcileModalComponent', () => {
  let component: SupplierInvoiceReconcileModalComponent;
  let fixture: ComponentFixture<SupplierInvoiceReconcileModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;
  let alertSpy: jasmine.SpyObj<HTMLIonAlertElement>;
  let invoiceServiceSpy: jasmine.SpyObj<SupplierInvoiceService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

  const mockInvoice: SupplierInvoice = {
    id: 1,
    invoiceNumber: 'INV-2026-001',
    supplierId: 10,
    supplierName: 'Metro Cash & Carry',
    invoiceDate: '2026-03-15',
    dueDate: '2026-04-15',
    totalHt: 250.0,
    totalVat: 50.0,
    totalTtc: 300.0,
    currency: 'EUR',
    status: 'PENDING_REVIEW',
    format: 'FACTUR_X',
    profile: 'EN 16931',
    fileName: 'factur-x.xml',
    fileChecksum: 'abc12345',
    legalComplianceStatus: 'COMPLIANT',
    createdAt: '2026-03-15T10:00:00',
    updatedAt: '2026-03-15T10:00:00',
    reconciliationNotes: 'Initial notes',
    items: []
  };

  const mockLine: ReconciliationLineDiff = {
    invoiceItemId: 101,
    lineNumber: 1,
    designation: 'Gin Bombay Sapphire 70cl',
    quantityInvoiced: 6,
    unitPriceInvoiced: 18.5,
    quantityOrdered: 6,
    quantityDelivered: 0,
    quantityVariance: 0,
    unitPriceOrdered: 18.0,
    priceVarianceAmount: 3.0,
    priceVariancePercent: 2.78,
    status: 'PRICE_VARIANCE',
    matchedIngredientId: 50,
    matchedIngredientName: 'Gin Bombay',
    matchedPoItemId: 201,
    isNewOrUnrecognized: false,
    varianceDetails: 'Price increased from 18.00 € to 18.50 €'
  };

  const mockReconciliation: SupplierInvoiceReconciliation = {
    invoiceId: 1,
    invoiceNumber: 'INV-2026-001',
    supplierId: 10,
    supplierName: 'Metro Cash & Carry',
    selectedPurchaseOrderId: 42,
    selectedPurchaseOrderReference: 'PO-2026-0042',
    invoicedTotalHt: 250.0,
    orderedTotalHt: 247.0,
    totalHtVariance: 3.0,
    status: 'PENDING_REVIEW',
    lines: [mockLine],
    candidatePurchaseOrders: [
      {
        id: 42,
        reference: 'PO-2026-0042',
        statut: 'ORDERED',
        dateCommande: '2026-03-14T10:00:00',
        totalHt: 247.0,
        totalTtc: 296.4
      }
    ],
    canAutoApply: true,
    reconciliationWarnings: []
  };

  const mockIngredients: Ingredient[] = [
    {
      id: 50,
      nom: 'Gin Bombay',
      uniteMesure: 'Bouteille',
      quantiteStock: 12,
      seuilAlerte: 3,
      prixUnitaire: 18.0,
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T00:00:00'
    }
  ];

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastCtrlSpy.create.and.returnValue(Promise.resolve(toastSpy));

    alertSpy = jasmine.createSpyObj('HTMLIonAlertElement', ['present']);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);
    alertCtrlSpy.create.and.returnValue(Promise.resolve(alertSpy));

    invoiceServiceSpy = jasmine.createSpyObj('SupplierInvoiceService', [
      'getReconciliationPreview',
      'reconcileInvoice',
      'applyInvoice',
      'downloadXml'
    ]);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getAll']);

    invoiceServiceSpy.getReconciliationPreview.and.returnValue(of(mockReconciliation));
    ingredientServiceSpy.getAll.and.returnValue(of(mockIngredients));

    await TestBed.configureTestingModule({
      imports: [
        SupplierInvoiceReconcileModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
        { provide: SupplierInvoiceService, useValue: invoiceServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierInvoiceReconcileModalComponent);
    component = fixture.componentInstance;
    component.invoice = mockInvoice;
    fixture.detectChanges();
  });

  it('should create the component and load initial preview data', () => {
    expect(component).toBeTruthy();
    expect(invoiceServiceSpy.getReconciliationPreview).toHaveBeenCalledWith(1, undefined);
    expect(ingredientServiceSpy.getAll).toHaveBeenCalled();
    expect(component.reconciliation()).toEqual(mockReconciliation);
    expect(component.selectedPoId()).toBe(42);
    expect(component.notes()).toBe('Initial notes');
  });

  it('should reload reconciliation preview when selecting another purchase order', () => {
    invoiceServiceSpy.getReconciliationPreview.and.returnValue(
      of({ ...mockReconciliation, selectedPurchaseOrderId: 99 })
    );
    component.onPurchaseOrderSelected(99);
    expect(component.selectedPoId()).toBe(99);
    expect(invoiceServiceSpy.getReconciliationPreview).toHaveBeenCalledWith(1, 99);
  });

  it('should update adjustments map when an ingredient is selected', () => {
    component.onIngredientSelected(mockLine, 50);

    const adj = component.adjustments().get(101);
    expect(adj).toBeDefined();
    expect(adj?.matchedIngredientId).toBe(50);
  });

  it('should update adjustments map when effective quantity is changed', () => {
    const inputEvent = {
      target: { value: '8' }
    } as unknown as Event;

    component.onQuantityChanged(mockLine, inputEvent);

    const adj = component.adjustments().get(101);
    expect(adj).toBeDefined();
    expect(adj?.effectiveReceivedQuantity).toBe(8);
  });

  it('should save reconciliation adjustments successfully', () => {
    const updatedInvoice: SupplierInvoice = { ...mockInvoice, status: 'RECONCILED' };
    invoiceServiceSpy.reconcileInvoice.and.returnValue(of(updatedInvoice));

    component.saveReconciliation();

    expect(component.isSaving()).toBeFalse();
    expect(invoiceServiceSpy.reconcileInvoice).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should show alert and execute apply when confirmed', async () => {
    const appliedInvoice: SupplierInvoice = { ...mockInvoice, status: 'APPLIED' };
    invoiceServiceSpy.applyInvoice.and.returnValue(of(appliedInvoice));

    let alertHandler: (() => void) | undefined;
    alertCtrlSpy.create.and.callFake((options: unknown) => {
      const opts = options as { buttons: Array<{ handler?: () => void }> };
      alertHandler = opts.buttons.find(b => b.handler)?.handler;
      return Promise.resolve(alertSpy);
    });

    await component.confirmAndApply();
    expect(alertCtrlSpy.create).toHaveBeenCalled();

    // Trigger confirmation handler
    alertHandler?.();

    expect(invoiceServiceSpy.applyInvoice).toHaveBeenCalledWith(1);
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(appliedInvoice, 'applied');
  });

  it('should dismiss modal on cancel', () => {
    component.dismiss();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('should ignore quantity changes when value is NaN or negative or line has no itemId', () => {
    const invalidEvent = { target: { value: '-5' } } as unknown as Event;
    component.onQuantityChanged(mockLine, invalidEvent);
    expect(component.adjustments().has(101)).toBeFalse();

    const nanEvent = { target: { value: 'not-a-number' } } as unknown as Event;
    component.onQuantityChanged(mockLine, nanEvent);
    expect(component.adjustments().has(101)).toBeFalse();

    const noIdLine = { ...mockLine, invoiceItemId: 0 };
    component.onQuantityChanged(noIdLine, { target: { value: '10' } } as unknown as Event);
    expect(component.adjustments().has(0)).toBeFalse();
  });

  it('should handle error when saving reconciliation adjustments', () => {
    invoiceServiceSpy.reconcileInvoice.and.returnValue(throwError(() => ({ error: { message: 'Reconcile failed' } })));
    component.saveReconciliation();
    expect(component.isSaving()).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should handle error when applying invoice', async () => {
    invoiceServiceSpy.applyInvoice.and.returnValue(throwError(() => ({ error: { message: 'Apply failed' } })));
    let alertHandler: (() => void) | undefined;
    alertCtrlSpy.create.and.callFake((options: unknown) => {
      const opts = options as { buttons: Array<{ handler?: () => void }> };
      alertHandler = opts.buttons.find(b => b.handler)?.handler;
      return Promise.resolve(alertSpy);
    });

    await component.confirmAndApply();
    alertHandler?.();

    expect(component.isApplying()).toBeFalse();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should download Factur-X XML when available', () => {
    const blob = new Blob(['<xml></xml>'], { type: 'application/xml' });
    invoiceServiceSpy.downloadXml.and.returnValue(of(blob));

    component.downloadXml();
    expect(invoiceServiceSpy.downloadXml).toHaveBeenCalledWith(1);
  });

  it('should handle error when XML download fails', () => {
    invoiceServiceSpy.downloadXml.and.returnValue(throwError(() => new Error('Not found')));

    component.downloadXml();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('should return empty poOptions when candidatePurchaseOrders is empty', () => {
    component.reconciliation.set({ ...mockReconciliation, candidatePurchaseOrders: [] });
    expect(component.poOptions()).toEqual([]);
  });
});
