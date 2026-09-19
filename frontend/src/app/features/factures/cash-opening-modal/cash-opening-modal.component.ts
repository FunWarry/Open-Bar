import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, IonSpinner, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkCircleOutline, cashOutline, calculatorOutline,
  addOutline, removeOutline, printOutline, receiptOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { AppSettingsService } from '../../../core/services/app-settings.service';
import { CashDrawerService } from '../../../core/services/cash-drawer.service';
import { CashDenomination, DEFAULT_EUR_DENOMINATIONS, getDefaultDenominationsForCurrency } from '../../../core/models/cash-denomination.model';
import { CashDrawerOpenRequest, CashDrawerSession } from '../../../core/models/cash-drawer.model';

/**
 * Modal dialog for morning cash drawer opening with starting float entry
 * and optional coin/banknote denomination breakdown counting.
 */
@Component({
  selector: 'app-cash-opening-modal',
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
  templateUrl: './cash-opening-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./cash-opening-modal.component.scss']
})
export class CashOpeningModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly cashDrawerService = inject(CashDrawerService);
  private readonly appSettingsService = inject(AppSettingsService);

  openingFloat = 150.0;
  showDenominations = false;
  notes = '';
  isSubmitting = false;

  denominations: CashDenomination[] = DEFAULT_EUR_DENOMINATIONS;
  counting: Record<string, number> = {};

  createdSession: CashDrawerSession | null = null;

  constructor() {
    addIcons({
      'close-outline': closeOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'cash-outline': cashOutline,
      'calculator-outline': calculatorOutline,
      'add-outline': addOutline,
      'remove-outline': removeOutline,
      'print-outline': printOutline,
      'receipt-outline': receiptOutline,
      closeOutline, checkmarkCircleOutline, cashOutline, calculatorOutline,
      addOutline, removeOutline, printOutline, receiptOutline
    });
  }

  ngOnInit(): void {
    const currency = this.appSettingsService.currencySymbol || '€';
    this.denominations = getDefaultDenominationsForCurrency('EUR', currency, 'AFTER');
    for (const d of this.denominations) {
      this.counting[d.key] = 0;
    }
  }

  /**
   * Computed sum of physical counted cash across all denominations.
   */
  get countedTotal(): number {
    let total = 0;
    for (const d of this.denominations) {
      const qty = this.counting[d.key] || 0;
      total += qty * d.value;
    }
    return Math.round(total * 100) / 100;
  }

  /**
   * Adjusts count of a given denomination by delta (+1 or -1).
   */
  updateCount(key: string, delta: number): void {
    const current = this.counting[key] || 0;
    const updated = Math.max(0, current + delta);
    this.counting[key] = updated;
    this.openingFloat = this.countedTotal;
  }

  /**
   * Handles direct numeric keyboard input on denomination quantity.
   */
  onDirectCountChange(key: string, rawVal: any): void {
    const parsed = Math.max(0, Number.parseInt(rawVal, 10) || 0);
    this.counting[key] = parsed;
    this.openingFloat = this.countedTotal;
  }

  /**
   * Sets preset default float amount.
   */
  setPresetFloat(amount: number): void {
    this.openingFloat = amount;
  }

  /**
   * Validates and submits drawer opening request to backend.
   */
  submitOpenDrawer(): void {
    if (this.openingFloat < 0) {
      return;
    }

    this.isSubmitting = true;
    const request: CashDrawerOpenRequest = {
      openingFloat: this.openingFloat,
      denominationsJson: this.showDenominations ? JSON.stringify(this.counting) : undefined,
      notes: this.notes.trim() || undefined
    };

    this.cashDrawerService.openDrawer(request).subscribe({
      next: session => {
        this.isSubmitting = false;
        this.createdSession = session;
        this.showToast(this.transloco.translate('CASH_DRAWER.OPENING_SUCCESS'));
        this.modalCtrl.dismiss({ opened: true, session });
      },
      error: err => {
        this.isSubmitting = false;
        const msg = err?.error?.message || this.transloco.translate('CASH_DRAWER.OPENING_ERROR');
        this.showToast(msg, 'danger');
      }
    });
  }

  /**
   * Prints the opening audit slip on ESC/POS printer.
   */
  printSlip(sessionId: number): void {
    this.cashDrawerService.printTillOpeningSlip(sessionId).subscribe({
      next: () => this.showToast(this.transloco.translate('CASH_DRAWER.PRINT_SUCCESS')),
      error: () => this.showToast(this.transloco.translate('CASH_DRAWER.PRINT_ERROR'), 'danger')
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
