import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, IonSpinner, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkCircleOutline, alertCircleOutline, arrowDownCircleOutline,
  arrowUpCircleOutline, shieldOutline, documentTextOutline, printOutline,
  cashOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { CashDrawerService } from '../../../core/services/cash-drawer.service';
import { CashMovementRequest, CashMovementType } from '../../../core/models/cash-drawer.model';

/**
 * Modal dialog for logging intra-day cash movements:
 * - CASH_IN: Cash deposit / change addition
 * - CASH_DROP: Mid-shift safe transfer (écrémage)
 * - PAID_OUT: Petty cash vendor / supply expense
 */
@Component({
  selector: 'app-cash-movement-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    AppCurrencyPipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSpinner
  ],
  templateUrl: './cash-movement-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./cash-movement-modal.component.scss']
})
export class CashMovementModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly cashDrawerService = inject(CashDrawerService);

  type: CashMovementType = 'CASH_DROP';
  amount = 50.0;
  reason = '';
  receiptReference = '';
  isSubmitting = false;

  readonly quickPresets = [10, 20, 50, 100, 200];

  constructor() {
    addIcons({
      closeOutline, checkmarkCircleOutline, alertCircleOutline, arrowDownCircleOutline,
      arrowUpCircleOutline, shieldOutline, documentTextOutline, printOutline,
      cashOutline
    });
  }

  ngOnInit(): void {
    this.cashDrawerService.getStatus().subscribe();
  }

  /**
   * Current theoretical physical cash residing in the drawer.
   */
  get currentTheoreticalCash(): number {
    return this.cashDrawerService.currentTheoreticalCash();
  }

  /**
   * Checks whether the current movement amount exceeds drawer cash.
   */
  get isOverdraw(): boolean {
    if (this.type === 'CASH_IN') {
      return false;
    }
    return (this.amount || 0) > this.currentTheoreticalCash;
  }

  /**
   * Validates form completeness and balance constraints.
   */
  get isValid(): boolean {
    return (
      this.amount > 0 &&
      this.reason.trim().length > 0 &&
      !this.isOverdraw &&
      !this.isSubmitting
    );
  }

  /**
   * Quick preset reason selector.
   */
  selectReason(r: string): void {
    this.reason = r;
  }

  /**
   * Quick preset amount setter.
   */
  setAmount(val: number): void {
    this.amount = val;
  }

  /**
   * Submits intra-day cash movement to backend.
   */
  submitMovement(): void {
    if (!this.isValid) {
      return;
    }

    this.isSubmitting = true;
    const request: CashMovementRequest = {
      type: this.type,
      amount: this.amount,
      reason: this.reason.trim(),
      receiptReference: this.receiptReference.trim() || undefined
    };

    this.cashDrawerService.recordMovement(request).subscribe({
      next: movement => {
        this.isSubmitting = false;
        this.showToast(this.transloco.translate('CASH_DRAWER.MOVEMENT_SUCCESS'));
        this.modalCtrl.dismiss({ movement });
      },
      error: err => {
        this.isSubmitting = false;
        const msg = err?.error?.message || this.transloco.translate('CASH_DRAWER.MOVEMENT_ERROR');
        this.showToast(msg, 'danger');
      }
    });
  }

  cancel(): void {
    this.modalCtrl.dismiss(null);
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
