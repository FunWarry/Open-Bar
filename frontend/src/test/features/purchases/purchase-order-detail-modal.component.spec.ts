import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { getTranslocoTestingModule } from '../../transloco-testing.module';
import { PurchaseOrderDetailModalComponent } from '../../../app/features/purchases/purchase-order-detail-modal/purchase-order-detail-modal.component';
import { PurchaseOrder } from '../../../app/core/models/purchase-order.model';

describe('PurchaseOrderDetailModalComponent', () => {
  let component: PurchaseOrderDetailModalComponent;
  let fixture: ComponentFixture<PurchaseOrderDetailModalComponent>;
  let modalCtrlSpy: jasmine.SpyObj<ModalController>;

  const mockOrder: PurchaseOrder = {
    id: 10,
    numeroCommande: 'CMD-2026-001',
    supplierId: 1,
    supplierNom: 'Distillerie des Alpes',
    status: 'ORDERED',
    dateCommande: '2026-09-20T10:00:00',
    dateLivraisonPrevue: '2026-09-22T00:00:00',
    totalHt: 200,
    totalTva: 40,
    totalTtc: 240,
    notes: 'Urgent delivery for the weekend',
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

  beforeEach(async () => {
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderDetailModalComponent,
        getTranslocoTestingModule()
      ],
      providers: [
        { provide: ModalController, useValue: modalCtrlSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderDetailModalComponent);
    component = fixture.componentInstance;
    component.order = mockOrder;
    fixture.detectChanges();
  });

  it('initializes component and displays order information', () => {
    expect(component).toBeTruthy();
    expect(component.order.numeroCommande).toBe('CMD-2026-001');
    expect(component.order.items).toHaveSize(2);
  });

  it('onClose() dismisses modal with close action', () => {
    component.onClose();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'close' });
  });

  it('onSend() dismisses modal with send action and order payload', () => {
    component.onSend();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'send', order: mockOrder });
  });

  it('onCancelOrder() dismisses modal with cancel action and order payload', () => {
    component.onCancelOrder();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'cancel', order: mockOrder });
  });

  it('onReceive() dismisses modal with receive action and order payload', () => {
    component.onReceive();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'receive', order: mockOrder });
  });

  it('onDownloadPdf() dismisses modal with pdf action and order payload', () => {
    component.onDownloadPdf();
    expect(modalCtrlSpy.dismiss).toHaveBeenCalledWith({ action: 'pdf', order: mockOrder });
  });
});
