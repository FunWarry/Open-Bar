import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonSegment, IonSegmentButton, ModalController, IonBadge, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cardOutline, cashOutline, walletOutline, closeOutline, checkmarkCircleOutline, heartOutline } from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

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
 * Payment modal component supporting payment method selection, quick tip suggestions (+5%, +10%, custom),
 * dynamic total recalculation, and cash change calculation (rendu de monnaie).
 *
 * Aligned with Figma Common system view Payment / Settlement layout (`628:1068`).
 */
@Component({
  selector: 'app-reglement-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe, TranslocoModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonSegment, IonSegmentButton, IonBadge, IonNote
  ],
  templateUrl: './reglement-modal.component.html',
  styleUrls: ['./reglement-modal.component.scss']
})
export class ReglementModalComponent implements OnInit {
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

  /** Selected tip mode: 'none', '5pct', '10pct', 'custom'. */
  tipMode: 'none' | '5pct' | '10pct' | 'custom' = 'none';

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

  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({ cardOutline, cashOutline, walletOutline, closeOutline, checkmarkCircleOutline, heartOutline });
  }

  ngOnInit(): void {
    if (!this.initialTotal || this.initialTotal < 0) {
      this.initialTotal = 0;
    }
  }

  /**
   * Calculates the tip amount based on current selection mode.
   *
   * @returns Tip amount rounded to 2 decimal places.
   */
  get tip(): number {
    switch (this.tipMode) {
      case '5pct':
        return Math.round(this.initialTotal * 0.05 * 100) / 100;
      case '10pct':
        return Math.round(this.initialTotal * 0.10 * 100) / 100;
      case 'custom':
        return Math.max(0, this.customTip || 0);
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
    if (this.paymentMethod !== 'ESPECES' || !this.receivedAmount) {
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

  /** Sets tip mode and resets custom tip value if not custom. */
  setTipMode(mode: 'none' | '5pct' | '10pct' | 'custom'): void {
    this.tipMode = mode;
    if (mode !== 'custom') {
      this.customTip = 0;
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
      montantRecu: this.paymentMethod === 'ESPECES' && this.receivedAmount ? this.receivedAmount : undefined,
      monnaieARendre: this.paymentMethod === 'ESPECES' ? this.changeToReturn : undefined
    };
    this.modalCtrl.dismiss(result);
  }

  /** Alias for backward-compatibility. */
  validerReglement(): void {
    this.confirmPayment();
  }
}
