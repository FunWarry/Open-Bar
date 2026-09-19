import { Component, Input, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cardOutline, cashOutline, walletOutline, closeOutline,
  checkmarkCircleOutline, heartOutline, sparklesOutline, receiptOutline,
  calculatorOutline, addOutline, removeOutline, documentTextOutline,
  pricetagOutline, printOutline, downloadOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { CashDrawerService } from '../../../core/services/cash-drawer.service';
import { CheckboxFieldComponent } from '../../../core/components/ui/checkbox-field/checkbox-field.component';
import { environment } from '../../../../environments/environment';

/** Result emitted when a payment is confirmed via {@link ReglementModalComponent}. */
export interface ReglementModalResult {
  /** Selected payment method: CARTE, ESPECES, TICKETS_RESTO, CHEQUES_VACANCES, AUTRE */
  modePaiement: string;
  /** Tip amount in EUR */
  pourboire: number;
  /** Total amount including tip and discounts */
  totalTotal: number;
  /** Discount amount in EUR if applied */
  remiseMontant?: number;
  /** Discount percentage if applied */
  remisePourcentage?: number;
  /** Amount received from customer (for cash payment) */
  montantRecu?: number;
  /** Change to return to customer (for cash payment) */
  monnaieARendre?: number;
  /** Whether to automatically liberate the table upon settlement */
  libererTable?: boolean;
}

/**
 * Modern modal for settling an invoice, part, or table bill.
 * Conforms to the unified payment design with hero amount, 5 payment modes,
 * commercial discounts, cash calculator, receipt printing, and table liberation.
 */
@Component({
  selector: 'app-reglement-modal',
  standalone: true,
  imports: [
    FormsModule,
    AppCurrencyPipe,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    CheckboxFieldComponent
  ],
  templateUrl: './reglement-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./reglement-modal.component.scss']
})
export class ReglementModalComponent implements OnInit {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly featureFlagService = inject(FeatureFlagService, { optional: true });
  private readonly cashDrawerService = inject(CashDrawerService, { optional: true });
  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  get currencySymbol(): string {
    return this.appSettingsService.currencySymbol;
  }

  /**
   * Indicates whether cash drawer module is enabled and the till is currently closed.
   */
  get isCashDrawerClosed(): boolean {
    if (!this.featureFlagService?.cashDrawerEnabled()) {
      return false;
    }
    return !this.cashDrawerService?.isOpened();
  }

  /** Base initial amount to pay in EUR. */
  @Input() initialTotal = 0;

  /** Alias for backward-compatibility. */
  @Input()
  get totalInitial(): number {
    return this.initialTotal;
  }
  set totalInitial(val: number) {
    this.initialTotal = val;
  }

  /** Optional invoice number (e.g. FAC-2026-00042). */
  @Input() invoiceNumber?: string;

  /** Optional invoice identifier for PDF download / print receipt. */
  @Input() factureId?: number;

  /** Optional table number. */
  @Input() tableNumber?: number;

  /** Optional table identifier. */
  @Input() tableId?: number;

  /** Optional title suffix (e.g. guest name for split payments). */
  @Input() shareName?: string;

  /** Alias for backward-compatibility. */
  @Input()
  get nomPart(): string | undefined {
    return this.shareName;
  }
  set nomPart(val: string | undefined) {
    this.shareName = val;
  }

  /** Whether to allow applying commercial discounts. */
  @Input() allowDiscount = true;

  /** Whether to display the table liberation checkbox. */
  @Input() canLibererTable = false;

  /** State of table liberation checkbox. */
  libererTable = true;

  /** Whether to display quick print / PDF action buttons. */
  @Input() showPrintActions = false;

  /** Selected payment method (default: CARTE). */
  paymentMethod = 'CARTE';

  /** Alias for backward-compatibility. */
  get modePaiement(): string {
    return this.paymentMethod;
  }
  set modePaiement(val: string) {
    this.paymentMethod = val;
  }

  /** Commercial discount mode: 'none', 'percent', 'fixed'. */
  discountMode: 'none' | 'percent' | 'fixed' = 'none';

  /** Percentage discount value (0 to 100). */
  discountPercent: number | null = null;

  /** Fixed discount amount value in EUR. */
  discountFixed: number | null = null;

  /** Selected tip mode: 'none', '5pct', '10pct', '15pct', 'custom'. */
  tipMode: 'none' | '5pct' | '10pct' | '15pct' | 'custom' = 'none';

  /** Custom tip amount in EUR. */
  customTip = 0;

  /** Alias for backward-compatibility. */
  get customPourboire(): number {
    return this.customTip;
  }
  set customPourboire(val: number) {
    this.customTip = val;
  }

  /** Amount received from customer for cash payment. */
  receivedAmount: number | null = null;

  /** Alias for backward-compatibility. */
  get montantRecu(): number | null {
    return this.receivedAmount;
  }
  set montantRecu(val: number | null) {
    this.receivedAmount = val;
  }

  /** Cash denominations presets in EUR. */
  readonly cashPresets = [10, 20, 50, 100];

  /** Quick cash increment amounts in EUR. */
  readonly cashIncrements = [5, 10, 20];

  constructor() {
    addIcons({
      cardOutline,
      cashOutline,
      walletOutline,
      closeOutline,
      checkmarkCircleOutline,
      heartOutline,
      sparklesOutline,
      receiptOutline,
      calculatorOutline,
      addOutline,
      removeOutline,
      documentTextOutline,
      pricetagOutline,
      printOutline,
      downloadOutline
    });
  }

  ngOnInit(): void {
    if (!this.initialTotal || this.initialTotal < 0) {
      this.initialTotal = 0;
    }
    if (this.featureFlagService?.cashDrawerEnabled()) {
      this.cashDrawerService?.getStatus().subscribe();
    }
  }

  /**
   * Calculates the calculated commercial discount in EUR.
   */
  get discountAmount(): number {
    if (!this.allowDiscount || this.discountMode === 'none') {
      return 0;
    }
    if (this.discountMode === 'percent') {
      const pct = Math.min(100, Math.max(0, Number(this.discountPercent) || 0));
      return Math.round(this.initialTotal * (pct / 100) * 100) / 100;
    }
    if (this.discountMode === 'fixed') {
      const fixed = Math.max(0, Number(this.discountFixed) || 0);
      return Math.min(this.initialTotal, Math.round(fixed * 100) / 100);
    }
    return 0;
  }

  /**
   * Amount remaining after applying commercial discount, before tips.
   */
  get netTotal(): number {
    return Math.max(0, Math.round((this.initialTotal - this.discountAmount) * 100) / 100);
  }

  /**
   * Calculates tip amount for a given percentage based on net total.
   *
   * @param percentage Tip percentage (e.g. 5, 10, 15)
   */
  getTipAmount(percentage: number): number {
    if (!this.netTotal || this.netTotal <= 0) return 0;
    return Math.round(this.netTotal * (percentage / 100) * 100) / 100;
  }

  /**
   * Calculates the tip amount based on current selection mode.
   *
   * @returns Tip amount rounded to 2 decimal places.
   */
  get tip(): number {
    switch (this.tipMode) {
      case '5pct':
        return this.getTipAmount(5);
      case '10pct':
        return this.getTipAmount(10);
      case '15pct':
        return this.getTipAmount(15);
      case 'custom':
        return Math.max(0, Number(this.customTip) || 0);
      default:
        return 0;
    }
  }

  /** Alias for backward-compatibility. */
  get pourboire(): number {
    return this.tip;
  }

  /**
   * Calculates grand total amount (discounted net amount + tip).
   */
  get totalWithTip(): number {
    return Math.round((this.netTotal + this.tip) * 100) / 100;
  }

  /** Alias for backward-compatibility. */
  get totalFinal(): number {
    return this.totalWithTip;
  }

  /** Alias for backward-compatibility. */
  get totalAvecPourboire(): number {
    return this.totalWithTip;
  }

  /**
   * Calculates the next round banknote suggestion superior to current total.
   */
  get smartNextBill(): number {
    const total = this.totalWithTip;
    if (total <= 0) return 10;
    const candidates = [10, 20, 50, 100, 200];
    const nextHigher = candidates.find(b => b > total);
    if (nextHigher) return nextHigher;
    return Math.ceil(total / 10) * 10;
  }

  /**
   * Change amount to return to customer.
   */
  get changeToReturn(): number {
    if (this.paymentMethod !== 'ESPECES' || !this.receivedAmount || this.receivedAmount <= this.totalWithTip) {
      return 0;
    }
    return Math.max(0, Math.round((this.receivedAmount - this.totalWithTip) * 100) / 100);
  }

  /** Alias for backward-compatibility. */
  get monnaieARendre(): number {
    return this.changeToReturn;
  }

  /**
   * Whether amount received in cash is sufficient.
   */
  get isReceivedAmountSufficient(): boolean {
    if (this.paymentMethod !== 'ESPECES') {
      return true;
    }
    if (this.isCashDrawerClosed) {
      return false;
    }
    if (this.receivedAmount === null || this.receivedAmount === undefined) {
      return true;
    }
    return this.receivedAmount >= this.totalWithTip;
  }

  /** Alias for backward-compatibility. */
  get isMontantRecuSuffisant(): boolean {
    return this.isReceivedAmountSufficient;
  }

  /** Selects payment method. */
  selectPaymentMethod(method: string): void {
    this.paymentMethod = method;
    if (method === 'ESPECES' && (!this.receivedAmount || this.receivedAmount < this.totalWithTip)) {
      this.receivedAmount = this.totalWithTip;
    }
  }

  /** Sets commercial discount mode. */
  setDiscountMode(mode: 'none' | 'percent' | 'fixed'): void {
    this.discountMode = mode;
    if (mode === 'percent' && (this.discountPercent === null || this.discountPercent === undefined)) {
      this.discountPercent = 10;
    } else if (mode === 'fixed' && (this.discountFixed === null || this.discountFixed === undefined)) {
      this.discountFixed = 5;
    }
  }

  /** Sets tip mode and resets custom tip value if not custom. */
  setTipMode(mode: 'none' | '5pct' | '10pct' | '15pct' | 'custom'): void {
    this.tipMode = mode;
    if (mode !== 'custom') {
      this.customTip = 0;
    }
  }

  /** Quick cash preset: exact amount. */
  setExactCash(): void {
    this.receivedAmount = this.totalWithTip;
  }

  /** Quick cash preset: set specific denomination. */
  setCashAmount(amount: number): void {
    this.receivedAmount = amount;
  }

  /** Adds quick cash increment (+5€, +10€, +20€). */
  addCashIncrement(amount: number): void {
    const current = Number(this.receivedAmount) || this.totalWithTip;
    this.receivedAmount = Math.round((current + amount) * 100) / 100;
  }

  /** Adjust custom tip with +/- buttons. */
  adjustCustomTip(delta: number): void {
    const current = Number(this.customTip) || 0;
    this.customTip = Math.max(0, Math.round((current + delta) * 100) / 100);
  }

  /** Triggers thermal receipt print. */
  imprimerRecu(): void {
    window.print();
  }

  /** Downloads or opens invoice PDF in new tab. */
  telechargerPdf(): void {
    if (this.factureId) {
      window.open(`${environment.apiUrl}/factures/${this.factureId}/pdf`, '_blank');
    }
  }

  /** Dismisses the modal without confirming payment. */
  cancel(): void {
    this.modalCtrl.dismiss(null);
  }

  /** Alias for backward-compatibility. */
  annuler(): void {
    this.cancel();
  }

  /** Confirms payment and dismisses modal emitting result payload. */
  confirmPayment(): void {
    const result: ReglementModalResult = {
      modePaiement: this.paymentMethod,
      pourboire: this.tip,
      totalTotal: this.totalWithTip,
      montantRecu: this.paymentMethod === 'ESPECES' && this.receivedAmount !== null ? this.receivedAmount : undefined,
      monnaieARendre: this.paymentMethod === 'ESPECES' ? this.changeToReturn : undefined
    };
    if (this.discountMode === 'fixed' && this.discountAmount) {
      result.remiseMontant = this.discountAmount;
    }
    if (this.discountMode === 'percent' && this.discountPercent) {
      result.remisePourcentage = Number(this.discountPercent) || 0;
    }
    if (this.canLibererTable) {
      result.libererTable = this.libererTable;
    }
    this.modalCtrl.dismiss(result);
  }

  /** Alias for backward-compatibility. */
  validerReglement(): void {
    this.confirmPayment();
  }
}
