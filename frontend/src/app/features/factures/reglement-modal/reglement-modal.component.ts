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
 * Aligned with Figma Vue système commun Payment / Settlement layout (`628:1068`).
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
  @Input() totalInitial = 0;

  /** Optional title suffix (e.g. guest name for split payments). */
  @Input() nomPart?: string;

  /** Selected payment method (default: CARTE). */
  modePaiement = 'CARTE';

  /** Selected tip mode: 'none', '5pct', '10pct', 'custom'. */
  tipMode: 'none' | '5pct' | '10pct' | 'custom' = 'none';

  /** Custom tip amount in EUR. */
  customPourboire = 0;

  /** Amount received from customer for cash payment. */
  montantRecu: number | null = null;

  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({ cardOutline, cashOutline, walletOutline, closeOutline, checkmarkCircleOutline, heartOutline });
  }

  ngOnInit(): void {
    if (!this.totalInitial || this.totalInitial < 0) {
      this.totalInitial = 0;
    }
  }

  /**
   * Calculates the tip amount based on current selection mode.
   *
   * @returns Tip amount rounded to 2 decimal places.
   */
  get pourboire(): number {
    switch (this.tipMode) {
      case '5pct':
        return Math.round(this.totalInitial * 0.05 * 100) / 100;
      case '10pct':
        return Math.round(this.totalInitial * 0.10 * 100) / 100;
      case 'custom':
        return Math.max(0, this.customPourboire || 0);
      case 'none':
      default:
        return 0;
    }
  }

  /**
   * Returns total amount due including tip.
   */
  get totalAvecPourboire(): number {
    return Math.round((this.totalInitial + this.pourboire) * 100) / 100;
  }

  /**
   * Calculates change to return for cash payments.
   */
  get monnaieARendre(): number {
    if (this.modePaiement !== 'ESPECES' || !this.montantRecu) {
      return 0;
    }
    return Math.max(0, Math.round((this.montantRecu - this.totalAvecPourboire) * 100) / 100);
  }

  /**
   * Whether amount received in cash is sufficient.
   */
  get isMontantRecuSuffisant(): boolean {
    if (this.modePaiement !== 'ESPECES') {
      return true;
    }
    if (this.montantRecu === null || this.montantRecu === undefined) {
      return true;
    }
    return this.montantRecu >= this.totalAvecPourboire;
  }

  /** Sets tip mode and resets custom tip value if not custom. */
  setTipMode(mode: 'none' | '5pct' | '10pct' | 'custom'): void {
    this.tipMode = mode;
    if (mode !== 'custom') {
      this.customPourboire = 0;
    }
  }

  /** Dismisses the modal without confirming payment. */
  annuler(): void {
    this.modalCtrl.dismiss(null);
  }

  /** Confirms payment and dismisses modal emitting result payload. */
  validerReglement(): void {
    const result: ReglementModalResult = {
      modePaiement: this.modePaiement,
      pourboire: this.pourboire,
      totalTotal: this.totalAvecPourboire,
      montantRecu: this.modePaiement === 'ESPECES' && this.montantRecu ? this.montantRecu : undefined,
      monnaieARendre: this.modePaiement === 'ESPECES' ? this.monnaieARendre : undefined
    };
    this.modalCtrl.dismiss(result);
  }
}
