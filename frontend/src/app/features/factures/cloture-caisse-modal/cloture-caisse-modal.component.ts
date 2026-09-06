import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonSpinner, ModalController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkCircleOutline, alertCircleOutline, calculatorOutline,
  cashOutline, printOutline, downloadOutline, documentTextOutline, lockClosedOutline,
  arrowForwardOutline, arrowBackOutline, shieldCheckmarkOutline, copyOutline,
  warningOutline, receiptOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { FactureService } from '../../../core/services/facture.service';
import { PrinterService } from '../../../core/services/printer.service';
import { DailyRecap } from '../../../core/models/daily-recap.model';
import { ClotureCaisseRequest, DailyCashClosure } from '../../../core/models/daily-cash-closure.model';

/**
 * Currency denomination item configuration for cash drawer counting.
 */
export interface CashDenomination {
  key: string;
  label: string;
  value: number;
  type: 'bill' | 'coin';
}

/**
 * Denominations supported in Eurozone cash register counting.
 */
export const EURO_DENOMINATIONS: CashDenomination[] = [
  { key: '50e', label: '50 €', value: 50.0, type: 'bill' },
  { key: '20e', label: '20 €', value: 20.0, type: 'bill' },
  { key: '10e', label: '10 €', value: 10.0, type: 'bill' },
  { key: '5e', label: '5 €', value: 5.0, type: 'bill' },
  { key: '2e', label: '2 €', value: 2.0, type: 'coin' },
  { key: '1e', label: '1 €', value: 1.0, type: 'coin' },
  { key: '050e', label: '0.50 €', value: 0.50, type: 'coin' },
  { key: '020e', label: '0.20 €', value: 0.20, type: 'coin' },
  { key: '010e', label: '0.10 €', value: 0.10, type: 'coin' },
  { key: '005e', label: '0.05 €', value: 0.05, type: 'coin' },
  { key: '002e', label: '0.02 €', value: 0.02, type: 'coin' },
  { key: '001e', label: '0.01 €', value: 0.01, type: 'coin' },
];

/**
 * Modal wizard guiding managers through end-of-day register closing (Z-Report):
 * 1. Initial opening float verification
 * 2. Interactive coin and bill physical counting with live totals
 * 3. Discrepancy calculation and mandatory justification note (if diff != 0)
 * 4. Final confirmation with sales locking warning
 * 5. Official Z-Report certificate with SHA-256 seal and export actions (print 80mm, PDF A4, FEC).
 */
@Component({
  selector: 'app-cloture-caisse-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    AppCurrencyPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonBadge,
    IonSpinner
  ],
  templateUrl: './cloture-caisse-modal.component.html',
  styleUrls: ['./cloture-caisse-modal.component.scss']
})
export class ClotureCaisseModalComponent implements OnInit {
  @Input() date!: string;
  @Input() recap!: DailyRecap;

  readonly denominations = EURO_DENOMINATIONS;
  readonly modalCtrl = inject(ModalController);
  private readonly factureService = inject(FactureService);
  private readonly printerService = inject(PrinterService);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  currentStep: 1 | 2 | 3 | 4 | 5 = 1;

  openingFloat = 150.0;
  counting: Record<string, number> = {};
  discrepancyReason = '';

  isSubmitting = false;
  isPrinting = false;
  isDownloadingPdf = false;
  isExportingFec = false;

  createdClosure: DailyCashClosure | null = null;

  constructor() {
    addIcons({
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      calculatorOutline,
      cashOutline,
      printOutline,
      downloadOutline,
      documentTextOutline,
      lockClosedOutline,
      arrowForwardOutline,
      arrowBackOutline,
      shieldCheckmarkOutline,
      copyOutline,
      warningOutline,
      receiptOutline
    });
  }

  ngOnInit(): void {
    if (!this.date) {
      this.date = new Date().toISOString().split('T')[0];
    }
    for (const d of this.denominations) {
      this.counting[d.key] = 0;
    }
  }

  /**
   * Cash collected through payments on the selected date.
   */
  get cashRevenue(): number {
    if (!this.recap?.ventilationModePaiement) {
      return 0;
    }
    const cashEntry = this.recap.ventilationModePaiement.find(
      p => p.modePaiement?.toUpperCase() === 'ESPECES' || p.modePaiement?.toUpperCase() === 'CASH'
    );
    return cashEntry ? cashEntry.totalTtc : 0;
  }

  /**
   * Expected theoretical cash present in drawer: opening float + cash revenue.
   */
  get theoreticalCash(): number {
    return Number((this.openingFloat + this.cashRevenue).toFixed(2));
  }

  /**
   * Physically counted cash computed from entered quantities.
   */
  get countedCash(): number {
    let total = 0;
    for (const d of this.denominations) {
      const qty = this.counting[d.key] || 0;
      total += qty * d.value;
    }
    return Number(total.toFixed(2));
  }

  /**
   * Net discrepancy between counted cash and theoretical cash.
   */
  get cashDiscrepancy(): number {
    return Number((this.countedCash - this.theoreticalCash).toFixed(2));
  }

  /**
   * True if there is a non-zero discrepancy.
   */
  get hasDiscrepancy(): boolean {
    return Math.abs(this.cashDiscrepancy) >= 0.01;
  }

  /**
   * Updates count for a specific denomination safely.
   */
  onCountChange(key: string, value: any): void {
    const parsed = parseInt(value, 10);
    this.counting[key] = isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }

  /**
   * Adjusts count by delta (+1 / -1).
   */
  adjustCount(key: string, delta: number): void {
    const current = this.counting[key] || 0;
    const next = Math.max(0, current + delta);
    this.counting[key] = next;
  }

  /**
   * Advances wizard to next step.
   */
  goToNextStep(): void {
    if (this.currentStep === 1) {
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      if (this.hasDiscrepancy && (!this.discrepancyReason || this.discrepancyReason.trim().length < 3)) {
        this.showToast(this.transloco.translate('CLOTURE.DISCREPANCY_REASON_REQUIRED'), 'warning');
        return;
      }
      this.currentStep = 4;
    }
  }

  /**
   * Moves back to previous step.
   */
  goToPrevStep(): void {
    if (this.currentStep > 1 && this.currentStep <= 4) {
      this.currentStep = (this.currentStep - 1) as any;
    }
  }

  /**
   * Submits final register closure request to backend.
   */
  confirmClosure(): void {
    this.isSubmitting = true;
    const request: ClotureCaisseRequest = {
      date: this.date,
      openingFloat: this.openingFloat,
      countedCash: this.countedCash,
      countingBreakdown: this.counting,
      discrepancyReason: this.hasDiscrepancy ? this.discrepancyReason.trim() : undefined
    };

    this.factureService.cloturerCaisse(request).subscribe({
      next: (closure: DailyCashClosure) => {
        this.isSubmitting = false;
        this.createdClosure = closure;
        this.currentStep = 5;
        this.showToast(this.transloco.translate('CLOTURE.SUCCESS_MESSAGE'), 'success');
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const msg = err.error?.message || this.transloco.translate('CLOTURE.ERROR_SUBMIT');
        this.showToast(msg, 'danger');
      }
    });
  }

  /**
   * Prints 80mm Z-report ticket on thermal printer.
   */
  printZReport(): void {
    if (!this.createdClosure) return;
    this.isPrinting = true;
    this.printerService.printZReport(this.createdClosure.id).subscribe({
      next: res => {
        this.isPrinting = false;
        const key = res.success ? 'CLOTURE.PRINT_SUCCESS' : 'CLOTURE.PRINT_FAILED';
        const color = res.success ? 'success' : 'warning';
        this.showToast(this.transloco.translate(key), color);
      },
      error: () => {
        this.isPrinting = false;
        this.showToast(this.transloco.translate('CLOTURE.PRINT_FAILED'), 'danger');
      }
    });
  }

  /**
   * Downloads official certified Z-Report PDF.
   */
  downloadPdf(): void {
    if (!this.createdClosure) return;
    this.isDownloadingPdf = true;
    this.factureService.downloadZReportPdf(this.createdClosure.id).subscribe({
      next: (blob: Blob) => {
        this.isDownloadingPdf = false;
        this.triggerFileDownload(blob, `ticket-z-${this.createdClosure?.closureNumber}.pdf`);
        this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_PDF_SUCCESS'), 'success');
      },
      error: () => {
        this.isDownloadingPdf = false;
        this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_PDF_ERROR'), 'danger');
      }
    });
  }

  /**
   * Downloads FEC French accounting export.
   */
  downloadFec(): void {
    if (!this.createdClosure) return;
    this.isExportingFec = true;
    this.factureService.downloadFecExport(this.createdClosure.id).subscribe({
      next: (blob: Blob) => {
        this.isExportingFec = false;
        this.triggerFileDownload(blob, `FEC-${this.createdClosure?.closureNumber}.txt`);
        this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_FEC_SUCCESS'), 'success');
      },
      error: () => {
        this.isExportingFec = false;
        this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_FEC_ERROR'), 'danger');
      }
    });
  }

  /**
   * Copies cryptographic hash to clipboard.
   */
  copySealHash(): void {
    if (this.createdClosure?.sha256Hash) {
      navigator.clipboard.writeText(this.createdClosure.sha256Hash);
      this.showToast(this.transloco.translate('CLOTURE.HASH_COPIED'), 'success');
    }
  }

  /**
   * Closes modal returning result.
   */
  dismiss(closed = false): void {
    this.modalCtrl.dismiss({ closed, closure: this.createdClosure });
  }

  private triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color
    });
    await toast.present();
  }
}
