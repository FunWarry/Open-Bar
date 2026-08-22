import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline, cashOutline, walletOutline, closeOutline,
  checkmarkCircleOutline, heartOutline, sparklesOutline, receiptOutline,
  calculatorOutline, addOutline, removeOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { AppSettingsService } from '../../../core/services/app-settings.service';

/** Result emitted when a payment is confirmed via {@link ReglementModalComponent}. */
export interface ReglementModalResult {
  /** Selected payment method: CARTE, ESPECES, TICKETS_RESTO */
  modePaiement: string;
  /** Tip amount in EUR */
  pourboire: number;
  /** Total amount including tip */
  totalTotal: number;
  /** Amount received from customer (for cash payment) */
  montantRecu?: number;
  /** Change to return to customer (for cash payment) */
  monnaieARendre?: number;
}

/**
 * Modern payment modal component supporting payment method selection, quick tip suggestions (+5%, +10%, +15%, custom),
 * dynamic total recalculation, and quick banknote cash change calculation (rendu de monnaie).
 *
 * Aligned with Figma Common system view Payment / Settlement layout (`628:1068`).
 */
@Component({
  selector: 'app-reglement-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppCurrencyPipe,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter
  ],
  templateUrl: './reglement-modal.component.html',
  styleUrls: ['./reglement-modal.component.scss']
})
export class ReglementModalComponent implements OnInit {
  private readonly appSettingsService = inject(AppSettingsService);

  get currencySymbol(): string {
    return this.appSettingsService.currencySymbol;
  }
  /** Base amount to pay in EUR. */
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

  /** Optional table number. */
  @Input() tableNumber?: number;

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

  /** Selected payment method (default: CARTE). */
  paymentMethod = 'CARTE';

  /** Alias for backward-compatibility. */
  get modePaiement(): string {
    return this.paymentMethod;
  }
  set modePaiement(val: string) {
    this.paymentMethod = val;
  }

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

  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      cardOutline, cashOutline, walletOutline, closeOutline,
      checkmarkCircleOutline, heartOutline, sparklesOutline, receiptOutline,
      calculatorOutline, addOutline, removeOutline
    });
  }

  ngOnInit(): void {
    if (!this.initialTotal || this.initialTotal < 0) {
      this.initialTotal = 0;
    }
  }

  /**
   * Calculates tip amount for a given percentage.
   */
  getTipAmount(percentage: number): number {
    if (!this.initialTotal || this.initialTotal <= 0) return 0;
    return Math.round(this.initialTotal * (percentage / 100) * 100) / 100;
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
      case 'none':
      default:
        return 0;
    }
  }

  /** Alias for backward-compatibility. */
  get pourboire(): number {
    return this.tip;
  }

  /**
   * Returns total amount due including tip.
   */
  get totalWithTip(): number {
    return Math.round((this.initialTotal + this.tip) * 100) / 100;
  }

  /** Alias for backward-compatibility. */
  get totalAvecPourboire(): number {
    return this.totalWithTip;
  }

  /**
   * Calculates change to return for cash payments.
   */
  get changeToReturn(): number {
    if (this.paymentMethod !== 'ESPECES' || this.receivedAmount === null || this.receivedAmount === undefined) {
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

  /** Adjust custom tip with +/- buttons. */
  adjustCustomTip(delta: number): void {
    const current = Number(this.customTip) || 0;
    this.customTip = Math.max(0, Math.round((current + delta) * 100) / 100);
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
    this.modalCtrl.dismiss(result);
  }

  /** Alias for backward-compatibility. */
  validerReglement(): void {
    this.confirmPayment();
  }
}
