import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { PurchasesPageComponent } from '../../../app/features/purchases/purchases-page.component';
import { SupplierService } from '../../../app/core/services/supplier.service';
import { PurchaseOrderService } from '../../../app/core/services/purchase-order.service';
import { IngredientService } from '../../../app/core/services/ingredient.service';
import { Supplier } from '../../../app/core/models/supplier.model';
import { PurchaseOrder } from '../../../app/core/models/purchase-order.model';
import { Ingredient } from '../../../app/core/models/ingredient.model';

describe('PurchasesPageComponent', () => {
  let component: PurchasesPageComponent;
  let fixture: ComponentFixture<PurchasesPageComponent>;
  let supplierServiceSpy: jasmine.SpyObj<SupplierService>;
  let purchaseOrderServiceSpy: jasmine.SpyObj<PurchaseOrderService>;
  let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;
  let toastCtrlSpy: jasmine.SpyObj<ToastController>;
  let alertCtrlSpy: jasmine.SpyObj<AlertController>;

  const mockSuppliers: Supplier[] = [
    {
      id: 1,
      nom: 'Brasserie du Mont-Blanc',
      contactNom: 'Sylvain Favre',
      email: 'contact@montblanc.fr',
      telephone: '+33 4 50 00 00 00',
      adresse: '125 Rue des Brasseurs',
      ville: 'Annecy',
      siret: '43920192800025',
      actif: true
    },
    {
      id: 2,
      nom: 'Distillerie des Alpes',
      contactNom: 'Marc Veyrat',
      email: 'marc@alpes.fr',
      telephone: '+33 4 79 00 00 00',
      adresse: '48 Chemin des Alambics',
      ville: 'Chambéry',
      siret: '51283920100018',
      actif: false
    }
  ];

  const mockOrders: PurchaseOrder[] = [
    {
      id: 10,
      numeroCommande: 'BC-2026-0001',
      supplierId: 1,
      supplierNom: 'Brasserie du Mont-Blanc',
      status: 'ORDERED',
      dateCommande: '2026-09-20T10:00:00',
      dateLivraisonPrevue: '2026-09-22',
      totalHt: 200,
      totalTva: 40,
      totalTtc: 240,
      items: []
    },
    {
      id: 11,
      numeroCommande: 'BC-2026-0002',
      supplierId: 2,
      supplierNom: 'Distillerie des Alpes',
      status: 'DRAFT',
      totalHt: 100,
      totalTva: 20,
      totalTtc: 120,
      items: []
    }
  ];

  const mockIngredients: Ingredient[] = [
    {
      id: 101,
      nom: 'Bière Blanche du Mont-Blanc',
      uniteMesure: 'Bouteille',
      quantiteStock: 48,
      seuilAlerte: 12,
      prixUnitaire: 2.10,
      codeBarre: '3760049010012',
      defaultSupplierNom: 'Brasserie du Mont-Blanc',
      createdAt: '',
      updatedAt: ''
    }
  ];

  beforeEach(async () => {
    supplierServiceSpy = jasmine.createSpyObj('SupplierService', ['getAll', 'create', 'update', 'delete', 'migrateLegacy']);
    purchaseOrderServiceSpy = jasmine.createSpyObj('PurchaseOrderService', ['getAll', 'create', 'update', 'send', 'cancel', 'downloadPdf', 'receive']);
    ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getAll']);
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
    toastCtrlSpy = jasmine.createSpyObj('ToastController', ['create']);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);

    supplierServiceSpy.getAll.and.returnValue(of(mockSuppliers));
    purchaseOrderServiceSpy.getAll.and.returnValue(of(mockOrders));
    ingredientServiceSpy.getAll.and.returnValue(of(mockIngredients));
    toastCtrlSpy.create.and.returnValue(Promise.resolve({ present: () => Promise.resolve() } as any));

    await TestBed.configureTestingModule({
      imports: [
        PurchasesPageComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: SupplierService, useValue: supplierServiceSpy },
        { provide: PurchaseOrderService, useValue: purchaseOrderServiceSpy },
        { provide: IngredientService, useValue: ingredientServiceSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: ToastController, useValue: toastCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchasesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component and loads initial data', () => {
    expect(component).toBeTruthy();
    expect(supplierServiceSpy.getAll).toHaveBeenCalled();
    expect(purchaseOrderServiceSpy.getAll).toHaveBeenCalled();
    expect(ingredientServiceSpy.getAll).toHaveBeenCalled();
    expect(component.suppliers()).toEqual(mockSuppliers);
    expect(component.purchaseOrders()).toEqual(mockOrders);
    expect(component.ingredients()).toEqual(mockIngredients);
  });

  it('switches tabs correctly', () => {
    expect(component.activeTab()).toBe('orders');

    component.selectTab('suppliers');
    expect(component.activeTab()).toBe('suppliers');
    expect(component.searchQuery()).toBe('');

    component.selectTab('pamp');
    expect(component.activeTab()).toBe('pamp');
  });

  it('filters purchase orders by status correctly', () => {
    expect(component.filteredOrders()).toHaveSize(2);

    component.statusFilter.set('ORDERED');
    expect(component.filteredOrders()).toHaveSize(1);
    expect(component.filteredOrders()[0].numeroCommande).toBe('BC-2026-0001');

    component.statusFilter.set('RECEIVED');
    expect(component.filteredOrders()).toHaveSize(0);
  });

  it('filters suppliers by search query', () => {
    component.searchQuery.set('Annecy');
    expect(component.filteredSuppliers()).toHaveSize(1);
    expect(component.filteredSuppliers()[0].nom).toBe('Brasserie du Mont-Blanc');

    component.searchQuery.set('Marc');
    expect(component.filteredSuppliers()).toHaveSize(1);
    expect(component.filteredSuppliers()[0].nom).toBe('Distillerie des Alpes');

    component.searchQuery.set('NonExistent');
    expect(component.filteredSuppliers()).toHaveSize(0);
  });

  it('filters ingredients for PAMP view by name or barcode', () => {
    component.searchQuery.set('Blanche');
    expect(component.filteredIngredients()).toHaveSize(1);

    component.searchQuery.set('3760049010012');
    expect(component.filteredIngredients()).toHaveSize(1);

    component.searchQuery.set('Vodka');
    expect(component.filteredIngredients()).toHaveSize(0);
  });

  it('sends order and reloads data', () => {
    purchaseOrderServiceSpy.send.and.returnValue(of(mockOrders[0]));
    component.sendOrder(mockOrders[0]);

    expect(purchaseOrderServiceSpy.send).toHaveBeenCalledWith(10);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('cancels order and reloads data', () => {
    purchaseOrderServiceSpy.cancel.and.returnValue(of(mockOrders[1]));
    component.cancelOrder(mockOrders[1]);

    expect(purchaseOrderServiceSpy.cancel).toHaveBeenCalledWith(11);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('downloads order PDF successfully', () => {
    const mockBlob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    purchaseOrderServiceSpy.downloadPdf.and.returnValue(of(mockBlob));

    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:http://localhost/test');
    spyOn(window.URL, 'revokeObjectURL');

    component.downloadPdf(mockOrders[0]);

    expect(purchaseOrderServiceSpy.downloadPdf).toHaveBeenCalledWith(10);
  });

  it('migrates legacy suppliers and reloads data', () => {
    supplierServiceSpy.migrateLegacy.and.returnValue(of(3));
    component.migrateLegacySuppliers();

    expect(supplierServiceSpy.migrateLegacy).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('opens order detail modal and handles dismiss action', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: { action: 'send', order: mockOrders[0] }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));
    purchaseOrderServiceSpy.send.and.returnValue(of(mockOrders[0]));

    await component.openOrderDetailModal(mockOrders[0]);

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(modalMock.present).toHaveBeenCalled();
    expect(purchaseOrderServiceSpy.send).toHaveBeenCalledWith(10);
  });

  it('triggers openOrderDetailModal on enter or space keydown', () => {
    spyOn(component, 'openOrderDetailModal');

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(enterEvent, 'preventDefault');
    component.onOrderCardKeyDown(enterEvent, mockOrders[0]);
    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(component.openOrderDetailModal).toHaveBeenCalledWith(mockOrders[0]);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    spyOn(spaceEvent, 'preventDefault');
    component.onOrderCardKeyDown(spaceEvent, mockOrders[0]);
    expect(spaceEvent.preventDefault).toHaveBeenCalled();

    const otherEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    spyOn(otherEvent, 'preventDefault');
    component.onOrderCardKeyDown(otherEvent, mockOrders[0]);
    expect(otherEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('filters purchase orders by text matching supplier, id, and notes', () => {
    component.purchaseOrders.set([
      { ...mockOrders[0], notes: 'Livraison matinale express' },
      mockOrders[1]
    ]);
    component.searchQuery.set('matinale');
    expect(component.filteredOrders()).toHaveSize(1);
    expect(component.filteredOrders()[0].id).toBe(10);

    component.searchQuery.set('11');
    expect(component.filteredOrders()).toHaveSize(1);
    expect(component.filteredOrders()[0].id).toBe(11);
  });

  it('handles error states in sendOrder, cancelOrder and downloadPdf', () => {
    purchaseOrderServiceSpy.send.and.returnValue(throwError(() => new Error('Network error')));
    component.sendOrder(mockOrders[0]);
    expect(toastCtrlSpy.create).toHaveBeenCalled();

    purchaseOrderServiceSpy.cancel.and.returnValue(throwError(() => new Error('Cancel error')));
    component.cancelOrder(mockOrders[0]);
    expect(toastCtrlSpy.create).toHaveBeenCalled();

    purchaseOrderServiceSpy.downloadPdf.and.returnValue(throwError(() => new Error('PDF error')));
    component.downloadPdf(mockOrders[0]);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('handles error state in migrateLegacySuppliers', () => {
    supplierServiceSpy.migrateLegacy.and.returnValue(throwError(() => new Error('Migrate error')));
    component.migrateLegacySuppliers();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('opens order form modal to create an order', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: {
          confirmed: true,
          order: { supplierId: 1, items: [] }
        }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));
    purchaseOrderServiceSpy.create.and.returnValue(of(mockOrders[0]));

    await component.openOrderFormModal();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(purchaseOrderServiceSpy.create).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('opens order form modal to update an existing order', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: {
          confirmed: true,
          orderId: 11,
          order: { supplierId: 2, items: [] }
        }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));
    purchaseOrderServiceSpy.update.and.returnValue(of(mockOrders[1]));

    await component.openOrderFormModal(mockOrders[1]);

    expect(purchaseOrderServiceSpy.update).toHaveBeenCalledWith(11, jasmine.any(Object));
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('opens reception modal and reloads on confirm', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: { confirmed: true }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));

    await component.openReceptionModal(mockOrders[0]);

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(purchaseOrderServiceSpy.getAll).toHaveBeenCalled();
  });

  it('opens supplier creation modal and saves supplier', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: {
          confirmed: true,
          supplier: { nom: 'Distillerie Savoyarde' }
        }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));
    supplierServiceSpy.create.and.returnValue(of(mockSuppliers[0]));

    await component.openCreateSupplierModal();

    expect(supplierServiceSpy.create).toHaveBeenCalled();
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('opens supplier edit modal and updates supplier', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: {
          confirmed: true,
          supplier: { nom: 'Brasserie Modifiée' }
        }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));
    supplierServiceSpy.update.and.returnValue(of(mockSuppliers[0]));

    await component.openEditSupplierModal(mockSuppliers[0]);

    expect(supplierServiceSpy.update).toHaveBeenCalledWith(1, jasmine.any(Object));
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('confirms and deletes supplier via alert dialog', async () => {
    let deleteHandler: () => void = () => {};
    const alertMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    alertCtrlSpy.create.and.callFake((opts: any) => {
      deleteHandler = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return Promise.resolve(alertMock as unknown as HTMLIonAlertElement);
    });
    supplierServiceSpy.delete.and.returnValue(of(undefined));

    await component.confirmDeleteSupplier(mockSuppliers[0]);

    expect(alertCtrlSpy.create).toHaveBeenCalled();
    expect(alertMock.present).toHaveBeenCalled();

    deleteHandler();
    expect(supplierServiceSpy.delete).toHaveBeenCalledWith(1);
    expect(toastCtrlSpy.create).toHaveBeenCalled();
  });

  it('opens barcode scanner and sets pamp tab and search query on detect', async () => {
    const modalMock = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: { barcode: '3760049010012', cancelled: false }
      }))
    };
    modalCtrlSpy.create.and.returnValue(Promise.resolve(modalMock as unknown as HTMLIonModalElement));

    await component.openGlobalBarcodeScanner();

    expect(modalCtrlSpy.create).toHaveBeenCalled();
    expect(component.searchQuery()).toBe('3760049010012');
    expect(component.activeTab()).toBe('pamp');
  });

  it('handles edit, cancel, receive, and pdf actions from order detail modal', async () => {
    spyOn(component, 'openOrderFormModal');
    spyOn(component, 'cancelOrder');
    spyOn(component, 'openReceptionModal');
    spyOn(component, 'downloadPdf');

    const createModalMock = (action: string) => ({
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy('onWillDismiss').and.returnValue(Promise.resolve({
        data: { action, order: mockOrders[0] }
      }))
    });

    modalCtrlSpy.create.and.returnValue(Promise.resolve(createModalMock('edit') as any));
    await component.openOrderDetailModal(mockOrders[0]);
    expect(component.openOrderFormModal).toHaveBeenCalledWith(mockOrders[0]);

    modalCtrlSpy.create.and.returnValue(Promise.resolve(createModalMock('cancel') as any));
    await component.openOrderDetailModal(mockOrders[0]);
    expect(component.cancelOrder).toHaveBeenCalledWith(mockOrders[0]);

    modalCtrlSpy.create.and.returnValue(Promise.resolve(createModalMock('receive') as any));
    await component.openOrderDetailModal(mockOrders[0]);
    expect(component.openReceptionModal).toHaveBeenCalledWith(mockOrders[0]);

    modalCtrlSpy.create.and.returnValue(Promise.resolve(createModalMock('pdf') as any));
    await component.openOrderDetailModal(mockOrders[0]);
    expect(component.downloadPdf).toHaveBeenCalledWith(mockOrders[0]);
  });
});
