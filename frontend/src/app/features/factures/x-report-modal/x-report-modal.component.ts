import { Component, Input, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, IonSpinner, IonBadge, ModalController, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, printOutline, downloadOutline, refreshOutline,
  receiptOutline, cashOutline, cardOutline, timeOutline, alertCircleOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { CashDrawerService } from '../../../core/services/cash-drawer.service';
import { XReport } from '../../../core/models/cash-drawer.model';

/**
 * Modal dialog presenting an intermediate, non-destructive X-Report (Rapport X)
 * for mid-shift management audit, with thermal printing and A4 PDF export capabilities.
 */
@Component({
  selector: 'app-x-report-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    AppCurrencyPipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSpinner,
    IonBadge
  ],
  templateUrl: './x-report-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./x-report-modal.component.scss']
})
export class XReportModalComponent implements OnInit {
  @Input() date?: string;

  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly cashDrawerService = inject(CashDrawerService);
  private readonly cdr = inject(ChangeDetectorRef);

  xReport: XReport | null = null;
  isLoading = true;
  isPrinting = false;
  isDownloadingPdf = false;

  constructor() {
    addIcons({
      closeOutline, printOutline, downloadOutline, refreshOutline,
      receiptOutline, cashOutline, cardOutline, timeOutline, alertCircleOutline,
      shieldCheckmarkOutline
    });
  }

  ngOnInit(): void {
    this.loadXReport();
  }

  /**
   * Fetches latest mid-shift X-Report snapshot from server.
   */
  loadXReport(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.cashDrawerService.getXReport(this.date).subscribe({
      next: report => {
        this.xReport = report;
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: err => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        const msg = err?.error?.message || this.transloco.translate('CASH_DRAWER.X_REPORT_LOAD_ERROR');
        this.showToast(msg, 'danger');
      }
    });
  }

  /**
   * Prints the 80mm intermediate ticket on the ESC/POS cash desk printer.
   */
  printTicket(): void {
    if (this.isPrinting) return;
    this.isPrinting = true;
    this.cdr.markForCheck();
    this.cashDrawerService.printXReport(this.date).subscribe({
      next: res => {
        this.isPrinting = false;
        this.cdr.markForCheck();
        if (res.success) {
          this.showToast(this.transloco.translate('CASH_DRAWER.PRINT_SUCCESS'));
        } else {
          this.showToast(res.message || this.transloco.translate('CASH_DRAWER.PRINT_ERROR'), 'danger');
        }
      },
      error: () => {
        this.isPrinting = false;
        this.cdr.markForCheck();
        this.showToast(this.transloco.translate('CASH_DRAWER.PRINT_ERROR'), 'danger');
      }
    });
  }

  /**
   * Downloads official A4 intermediate X-Report PDF.
   */
  downloadPdf(): void {
    if (this.isDownloadingPdf) return;
    this.isDownloadingPdf = true;
    this.cdr.markForCheck();
    this.cashDrawerService.downloadXReportPdf(this.date).subscribe({
      next: blob => {
        this.isDownloadingPdf = false;
        this.cdr.markForCheck();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const formattedDate = this.xReport?.reportDate || 'courant';
        a.download = `rapport-x-${formattedDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        this.showToast(this.transloco.translate('CASH_DRAWER.PDF_DOWNLOAD_SUCCESS'));
      },
      error: () => {
        this.isDownloadingPdf = false;
        this.cdr.markForCheck();
        this.showToast(this.transloco.translate('CASH_DRAWER.PDF_DOWNLOAD_ERROR'), 'danger');
      }
    });
  }

  cancel(): void {
    this.modalCtrl.dismiss(null);
  }

  /**
   * Returns Ionic theme color name for a given cash movement type.
   */
  getMovementColor(type: string): string {
    switch (type) {
      case 'CASH_IN':
        return 'success';
      case 'CASH_DROP':
        return 'warning';
      case 'PAID_OUT':
        return 'danger';
      default:
        return 'medium';
    }
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
