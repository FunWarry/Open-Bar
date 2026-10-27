import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ClientPaymentModalComponent } from '../../../../../app/features/client/components/client-payment-modal/client-payment-modal.component';
import { OnlinePaymentService } from '../../../../../app/core/services/online-payment.service';
import {
  PaymentIntentResponse,
  PaymentSuccessResponse,
  TableBillSummary
} from '../../../../../app/core/models/payment.model';

describe('ClientPaymentModalComponent', () => {
  let component: ClientPaymentModalComponent;
  let fixture: ComponentFixture<ClientPaymentModalComponent>;
  let paymentServiceMock: jasmine.SpyObj<OnlinePaymentService>;
  let toastCtrlMock: jasmine.SpyObj<ToastController>;
  let toastSpy: jasmine.SpyObj<HTMLIonToastElement>;

  const mockBill: TableBillSummary = {
    tableId: 10,
    tableNumber: 4,
    activeOrdersCount: 1,
    totalItemsCount: 2,
    subtotalVatExcluded: 25.0,
    vatAmount: 5.0,
    subtotalVatIncluded: 30.0,
    alreadyPaidAmount: 10.0,
    remainingBalance: 20.0,
    isFullySettled: false,
    settlements: [],
    paymentProvider: 'SANDBOX',
    stripePublishableKey: null,
    currency: 'EUR',
    items: [
      {
        ligneId: 1,
        boissonNom: 'Mojito',
        quantite: 1,
        prixUnitaire: 8.0,
        totalLigne: 8.0,
        guestName: 'Alex',
        orderStatus: 'SERVIE',
        orderDate: '2026-10-27T12:00:00'
      },
      {
        ligneId: 2,
        boissonNom: 'Pina Colada',
        quantite: 1,
        prixUnitaire: 12.0,
        totalLigne: 12.0,
        guestName: 'Sam',
        orderStatus: 'SERVIE',
        orderDate: '2026-10-27T12:05:00'
      }
    ]
  };

  const mockIntent: PaymentIntentResponse = {
    transactionId: 'tx_sim_001',
    clientSecret: 'secret_sim_001',
    amount: 20.0,
    tipAmount: 2.0,
    totalAmount: 22.0,
    currency: 'EUR',
    provider: 'SANDBOX',
    status: 'PENDING'
  };

  const mockSuccess: PaymentSuccessResponse = {
    transactionId: 'tx_sim_001',
    status: 'SUCCEEDED',
    baseAmount: 20.0,
    tipAmount: 2.0,
    totalAmount: 22.0,
    currency: 'EUR',
    remainingBalance: 0,
    isTableFullySettled: true,
    tableLiberated: true,
    receiptDownloadUrl: '/api/public/tables/10/payments/tx_sim_001/receipt.pdf'
  };

  beforeEach(async () => {
    paymentServiceMock = jasmine.createSpyObj<OnlinePaymentService>('OnlinePaymentService', [
      'getTableBill',
      'createPaymentIntent',
      'confirmSandboxPayment',
      'sendReceiptEmail',
      'liberateTable',
      'getReceiptPdfUrl'
    ]);

    paymentServiceMock.getTableBill.and.returnValue(of(mockBill));
    paymentServiceMock.createPaymentIntent.and.returnValue(of(mockIntent));
    paymentServiceMock.confirmSandboxPayment.and.returnValue(of(mockSuccess));
    paymentServiceMock.sendReceiptEmail.and.returnValue(of(void 0));
    paymentServiceMock.liberateTable.and.returnValue(of(void 0));
    paymentServiceMock.getReceiptPdfUrl.and.returnValue('/api/public/tables/10/payments/tx_sim_001/receipt.pdf');

    toastSpy = jasmine.createSpyObj<HTMLIonToastElement>('HTMLIonToastElement', ['present']);
    toastCtrlMock = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrlMock.create.and.returnValue(Promise.resolve(toastSpy));

    await TestBed.configureTestingModule({
      imports: [
        ClientPaymentModalComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'fr' }
        })
      ],
      providers: [
        { provide: OnlinePaymentService, useValue: paymentServiceMock },
        { provide: ToastController, useValue: toastCtrlMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientPaymentModalComponent);
    component = fixture.componentInstance;
    component.tableId = 10;
    component.tableNumero = 4;
    component.guestName = 'Alex';
    fixture.detectChanges();
  });

  it('should create the component and load bill breakdown', () => {
    expect(component).toBeTruthy();
    expect(paymentServiceMock.getTableBill).toHaveBeenCalledWith(10, 'Alex');
    expect(component.billSummary()).toEqual(mockBill);
    expect(component.isLoading()).toBeFalse();
  });

  it('should calculate base amount for FULL mode', () => {
    component.setSplitMode('FULL');
    expect(component.computedBaseAmount()).toBe(20.0);
  });

  it('should calculate base amount for MY_ITEMS mode based on guest nickname', () => {
    component.setSplitMode('MY_ITEMS');
    expect(component.myPersonalItems()).toHaveSize(1);
    expect(component.myPersonalItems()[0].boissonNom).toBe('Mojito');
    expect(component.computedBaseAmount()).toBe(8.0);
  });

  it('should calculate base amount for EQUAL_SPLIT mode', () => {
    component.setSplitMode('EQUAL_SPLIT');
    component.numberOfPersons.set(2);
    expect(component.computedBaseAmount()).toBe(10.0);

    component.setNumberOfPersons(1);
    expect(component.numberOfPersons()).toBe(3);
    expect(component.computedBaseAmount()).toBe(6.67);
  });

  it('should calculate base amount for CUSTOM_AMOUNT mode', () => {
    component.setSplitMode('CUSTOM_AMOUNT');
    component.onCustomAmountChange(15.5);
    expect(component.computedBaseAmount()).toBe(15.5);
  });

  it('should compute tip amount and total to charge correctly', () => {
    component.setSplitMode('FULL');
    component.setTipPercentage(10);
    expect(component.computedTipAmount()).toBe(2.0);
    expect(component.computedTotalToCharge()).toBe(22.0);
  });

  it('should execute checkout with Sandbox simulator successfully', () => {
    spyOn(component.paymentCompleted, 'emit');

    component.setSplitMode('FULL');
    component.setTipPercentage(10);
    component.processCheckout('card');

    expect(paymentServiceMock.createPaymentIntent).toHaveBeenCalled();
    expect(paymentServiceMock.confirmSandboxPayment).toHaveBeenCalledWith(10, {
      transactionId: 'tx_sim_001',
      clientSecret: 'secret_sim_001',
      paymentMethodType: 'card'
    });
    expect(component.paymentSuccess()).toEqual(mockSuccess);
    expect(component.paymentCompleted.emit).toHaveBeenCalledWith(mockSuccess);
    expect(component.tableLiberatedSuccess()).toBeTrue();
  });

  it('should handle payment error gracefully with a danger toast', () => {
    paymentServiceMock.createPaymentIntent.and.returnValue(throwError(() => ({ error: { message: 'Card declined' } })));

    component.processCheckout('card');

    expect(component.isProcessingPayment()).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalled();
  });

  it('should dispatch receipt email when requested', () => {
    component.paymentSuccess.set(mockSuccess);
    component.emailReceiptForm.patchValue({ email: 'patron@example.com' });

    component.sendEmailReceipt();

    expect(paymentServiceMock.sendReceiptEmail).toHaveBeenCalledWith(10, 'tx_sim_001', 'patron@example.com');
    expect(component.emailSentSuccess()).toBeTrue();
  });

  it('should liberate table when requested', () => {
    component.liberateTableNow();

    expect(paymentServiceMock.liberateTable).toHaveBeenCalledWith(10, 'Alex');
    expect(component.tableLiberatedSuccess()).toBeTrue();
  });

  it('should emit closeModal on dismiss() and backdrop click', () => {
    spyOn(component.closeModal, 'emit');

    component.dismiss();
    expect(component.closeModal.emit).toHaveBeenCalled();

    const mockEvent = {
      target: {
        classList: {
          contains: (cls: string) => cls === 'client-payment-backdrop'
        }
      }
    } as unknown as MouseEvent;

    component.onBackdropClick(mockEvent);
    expect(component.closeModal.emit).toHaveBeenCalledTimes(2);
  });

  it('should return correct receiptPdfUrl', () => {
    expect(component.receiptPdfUrl).toBe('#');

    component.paymentSuccess.set(mockSuccess);
    expect(component.receiptPdfUrl).toBe('/api/public/tables/10/payments/tx_sim_001/receipt.pdf');
  });

  it('should show warning toast when processCheckout has zero base amount', () => {
    component.billSummary.set({
      ...mockBill,
      remainingBalance: 0
    });

    component.processCheckout('card');

    expect(paymentServiceMock.createPaymentIntent).not.toHaveBeenCalled();
    expect(toastCtrlMock.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'warning'
    }));
  });

  it('should handle confirmSandboxPayment failure with danger toast', () => {
    paymentServiceMock.confirmSandboxPayment.and.returnValue(throwError(() => ({ error: { message: 'Failed settlement' } })));

    component.setSplitMode('FULL');
    component.processCheckout('card');

    expect(component.isProcessingPayment()).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  });

  it('should handle sendEmailReceipt failure with danger toast', () => {
    paymentServiceMock.sendReceiptEmail.and.returnValue(throwError(() => new Error('SMTP Error')));
    component.paymentSuccess.set(mockSuccess);
    component.emailReceiptForm.patchValue({ email: 'patron@example.com' });

    component.sendEmailReceipt();

    expect(component.isSendingEmail()).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  });

  it('should handle liberateTable failure with danger toast', () => {
    paymentServiceMock.liberateTable.and.returnValue(throwError(() => new Error('Lock timeout')));

    component.liberateTableNow();

    expect(component.isLiberatingTable()).toBeFalse();
    expect(toastCtrlMock.create).toHaveBeenCalledWith(jasmine.objectContaining({
      color: 'danger'
    }));
  });

  it('should support custom tip amount', () => {
    component.setSplitMode('FULL');
    component.setTipPercentage(0);
    component.customTipAmount.set(3.5);

    expect(component.computedTipAmount()).toBe(3.5);
    expect(component.computedTotalToCharge()).toBe(23.5);
  });
});
