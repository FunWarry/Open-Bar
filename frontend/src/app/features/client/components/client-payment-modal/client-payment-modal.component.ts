import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastController, IonIcon, IonSpinner, IonButton } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  cashOutline,
  receiptOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  downloadOutline,
  mailOutline,
  peopleOutline,
  personOutline,
  sparklesOutline,
  logOutOutline,
  chevronForwardOutline,
  arrowBackOutline,
  refreshOutline
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OnlinePaymentService } from '../../../../core/services/online-payment.service';
import {
  PaymentIntentResponse,
  PaymentSplitMode,
  PaymentSuccessResponse,
  TableBillItem,
  TableBillSummary
} from '../../../../core/models/payment.model';
import { AppCurrencyPipe } from '../../../../core/pipes/app-currency.pipe';
import { InputFieldComponent } from '../../../../core/components/ui/input-field/input-field.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';
import { FilterChipComponent } from '../../../../core/components/ui/filter-chip/filter-chip.component';

/**
 * Interactive patron modal for QR mobile bill review, split selection,
 * tip calculation, online payment execution (Stripe & Sandbox simulator),
 * 1-click legal PDF receipts, and table liberation.
 */
@Component({
  selector: 'app-client-payment-modal',
  standalone: true,
  templateUrl: './client-payment-modal.component.html',
  styleUrls: ['./client-payment-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoModule,
    IonIcon,
    IonSpinner,
    IonButton,
    AppCurrencyPipe,
    InputFieldComponent,
    ActionButtonComponent,
    FilterChipComponent
  ]
})
export class ClientPaymentModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) tableId!: number;
  @Input() tableNumero?: number;
  @Input() guestName?: string;

  @Output() closeModal = new EventEmitter<void>();
  @Output() paymentCompleted = new EventEmitter<PaymentSuccessResponse>();

  private readonly paymentService = inject(OnlinePaymentService);
  private readonly translocoService = inject(TranslocoService);
  private readonly toastCtrl = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // State signals
  isLoading = signal<boolean>(true);
  isProcessingPayment = signal<boolean>(false);
  isSendingEmail = signal<boolean>(false);
  isLiberatingTable = signal<boolean>(false);

  billSummary = signal<TableBillSummary | null>(null);
  activeSplitMode = signal<PaymentSplitMode>('FULL');
  tipPercentage = signal<number>(0);
  customTipAmount = signal<number>(0);
  numberOfPersons = signal<number>(2);
  customSplitAmount = signal<number>(0);

  // Success view state
  paymentSuccess = signal<PaymentSuccessResponse | null>(null);
  emailSentSuccess = signal<boolean>(false);
  tableLiberatedSuccess = signal<boolean>(false);

  // Forms
  customAmountForm!: FormGroup;
  emailReceiptForm!: FormGroup;
  liberateTableCheckbox = signal<boolean>(false);

  readonly tipOptions = [
    { label: '0%', value: 0 },
    { label: '5%', value: 5 },
    { label: '10%', value: 10 },
    { label: '15%', value: 15 }
  ];

  constructor() {
    addIcons({
      cardOutline,
      cashOutline,
      receiptOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      downloadOutline,
      mailOutline,
      peopleOutline,
      personOutline,
      sparklesOutline,
      logOutOutline,
      chevronForwardOutline,
      arrowBackOutline,
      refreshOutline
    });
  }

  ngOnInit(): void {
    this.initForms();
    this.loadBill();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.customAmountForm = this.fb.group({
      amount: [5.0, [Validators.required, Validators.min(0.5)]]
    });
    this.customAmountForm.get('amount')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => this.customSplitAmount.set(Number(val) || 0));

    this.emailReceiptForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  /**
   * Loads or refreshes the live table bill breakdown from the backend.
   */
  loadBill(): void {
    if (!this.tableId) return;
    this.isLoading.set(true);
    this.paymentService.getTableBill(this.tableId, this.guestName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.billSummary.set(summary);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
          void this.showToast('CLIENT.PAYMENT.ERR_LOAD_BILL', 'danger');
        }
      });
  }

  /**
   * Computes the base settlement amount depending on the active split mode.
   */
  readonly computedBaseAmount = computed(() => {
    const summary = this.billSummary();
    if (!summary) return 0;

    const remaining = summary.remainingBalance;
    if (remaining <= 0) return 0;

    switch (this.activeSplitMode()) {
      case 'FULL':
        return remaining;

      case 'MY_ITEMS': {
        const myItems = this.myPersonalItems();
        const total = myItems.reduce((acc, item) => acc + (item.totalLigne || 0), 0);
        return Math.min(total > 0 ? total : remaining, remaining);
      }

      case 'EQUAL_SPLIT': {
        const count = Math.max(1, this.numberOfPersons());
        const split = Math.round((remaining / count) * 100) / 100;
        return Math.min(split, remaining);
      }

      case 'CUSTOM_AMOUNT': {
        const custom = this.customSplitAmount();
        return Math.min(custom > 0 ? custom : remaining, remaining);
      }

      default:
        return remaining;
    }
  });

  /**
   * Filters line items that match the customer's personal nickname.
   */
  readonly myPersonalItems = computed<TableBillItem[]>(() => {
    const summary = this.billSummary();
    const cleanGuest = this.guestName?.trim().toLowerCase();
    if (!summary?.items || !cleanGuest) {
      return [];
    }
    return summary.items.filter(item =>
      item.guestName?.toLowerCase().includes(cleanGuest) ||
      item.boissonNom?.toLowerCase().includes(`[${cleanGuest}]`)
    );
  });

  /**
   * Computes tip amount based on active tip chip or custom input.
   */
  readonly computedTipAmount = computed(() => {
    const base = this.computedBaseAmount();
    if (base <= 0) return 0;

    const pct = this.tipPercentage();
    if (pct > 0) {
      return Math.round((base * (pct / 100)) * 100) / 100;
    }
    return this.customTipAmount();
  });

  /**
   * Computes total amount to be charged (base + tip).
   */
  readonly computedTotalToCharge = computed(() => {
    return Math.round((this.computedBaseAmount() + this.computedTipAmount()) * 100) / 100;
  });

  setSplitMode(mode: PaymentSplitMode): void {
    this.activeSplitMode.set(mode);
    this.cdr.markForCheck();
  }

  setTipPercentage(pct: number): void {
    this.tipPercentage.set(pct);
    this.customTipAmount.set(0);
    this.cdr.markForCheck();
  }

  setNumberOfPersons(delta: number): void {
    const next = Math.max(2, Math.min(20, this.numberOfPersons() + delta));
    this.numberOfPersons.set(next);
    this.cdr.markForCheck();
  }

  onCustomAmountChange(val: number | string | null): void {
    const num = Number(val) || 0;
    this.customSplitAmount.set(num);
  }

  /**
   * Executes mobile checkout via Sandbox simulation or Stripe Elements.
   */
  processCheckout(paymentMethod: 'card' | 'apple_pay' = 'card'): void {
    const summary = this.billSummary();
    if (!summary) return;

    const baseAmount = this.computedBaseAmount();
    if (baseAmount <= 0) {
      void this.showToast('CLIENT.PAYMENT.ERR_INVALID_AMOUNT', 'warning');
      return;
    }

    const tip = this.computedTipAmount();
    const total = this.computedTotalToCharge();
    const idempotencyKey = `tx-${this.tableId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    this.isProcessingPayment.set(true);

    const intentPayload = {
      guestName: this.guestName || 'Client QR',
      email: this.emailReceiptForm.get('email')?.value || null,
      splitMode: this.activeSplitMode(),
      baseAmount,
      tipAmount: tip,
      totalAmount: total,
      splitPersonsCount: this.activeSplitMode() === 'EQUAL_SPLIT' ? this.numberOfPersons() : null,
      selectedItemIds: null,
      idempotencyKey
    };

    this.paymentService.createPaymentIntent(this.tableId, intentPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (intent: PaymentIntentResponse) => {
          this.confirmTransaction(intent, paymentMethod);
        },
        error: (err) => {
          this.isProcessingPayment.set(false);
          this.cdr.markForCheck();
          const msg = err?.error?.message || 'CLIENT.PAYMENT.ERR_INTENT_FAILED';
          void this.showToast(msg, 'danger');
        }
      });
  }

  private confirmTransaction(intent: PaymentIntentResponse, paymentMethod: string): void {
    // If Sandbox simulator mode, confirm instantly through the mock API
    this.paymentService.confirmSandboxPayment(this.tableId, {
      transactionId: intent.transactionId,
      clientSecret: intent.clientSecret,
      paymentMethodType: paymentMethod
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success: PaymentSuccessResponse) => {
          this.isProcessingPayment.set(false);
          this.paymentSuccess.set(success);
          this.paymentCompleted.emit(success);

          // If patron checked liberation upfront, update state
          if (success.tableLiberated) {
            this.tableLiberatedSuccess.set(true);
          }

          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isProcessingPayment.set(false);
          this.cdr.markForCheck();
          const msg = err?.error?.message || 'CLIENT.PAYMENT.ERR_CONFIRM_FAILED';
          void this.showToast(msg, 'danger');
        }
      });
  }

  /**
   * Dispatches invoice PDF receipt to the requested email address.
   */
  sendEmailReceipt(): void {
    const success = this.paymentSuccess();
    const email = this.emailReceiptForm.get('email')?.value;
    if (!success || !email || this.emailReceiptForm.invalid) {
      return;
    }

    this.isSendingEmail.set(true);
    this.paymentService.sendReceiptEmail(this.tableId, success.transactionId, email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSendingEmail.set(false);
          this.emailSentSuccess.set(true);
          this.cdr.markForCheck();
          void this.showToast('CLIENT.PAYMENT.EMAIL_SENT_SUCCESS', 'success');
        },
        error: () => {
          this.isSendingEmail.set(false);
          this.cdr.markForCheck();
          void this.showToast('CLIENT.PAYMENT.ERR_EMAIL_SEND', 'danger');
        }
      });
  }

  /**
   * Confirms patron table departure and marks the table free in real time.
   */
  liberateTableNow(): void {
    this.isLiberatingTable.set(true);
    this.paymentService.liberateTable(this.tableId, this.guestName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLiberatingTable.set(false);
          this.tableLiberatedSuccess.set(true);
          this.cdr.markForCheck();
          void this.showToast('CLIENT.PAYMENT.TABLE_LIBERATED_SUCCESS', 'success');
        },
        error: () => {
          this.isLiberatingTable.set(false);
          this.cdr.markForCheck();
          void this.showToast('CLIENT.PAYMENT.ERR_LIBERATE_TABLE', 'danger');
        }
      });
  }

  /**
   * Gets the legal PDF direct download link.
   */
  get receiptPdfUrl(): string {
    const success = this.paymentSuccess();
    if (!success) return '#';
    return this.paymentService.getReceiptPdfUrl(this.tableId, success.transactionId);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('client-payment-backdrop')) {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.closeModal.emit();
  }

  private async showToast(messageKey: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translocoService.translate(messageKey),
      duration: 3500,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
