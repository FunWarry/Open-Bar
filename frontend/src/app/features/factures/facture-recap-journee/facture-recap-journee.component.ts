import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonSpinner,
  IonRefresher, IonRefresherContent, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline, printOutline, calendarOutline, cashOutline,
  cardOutline, receiptOutline, peopleOutline, trendingUpOutline, refreshOutline,
  lockClosedOutline, shieldCheckmarkOutline, documentTextOutline, copyOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import { FactureService } from '../../../core/services/facture.service';
import { PrinterService } from '../../../core/services/printer.service';
import { DailyRecap, PaymentModeSummary } from '../../../core/models/daily-recap.model';
import { DailyCashClosure } from '../../../core/models/daily-cash-closure.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';
import { ClotureCaisseModalComponent } from '../cloture-caisse-modal/cloture-caisse-modal.component';

/**
 * Daily Sales Closing Summary component (Z-Report) for Managers in OpenBar (Figma 628:1096).
 * Provides daily revenue KPIs, VAT rate breakdowns, payment mode breakdowns, date picking,
 * daily cash register closure wizard, certified status banner, and PDF/FEC export / printing functionality.
 */
@Component({
  selector: 'app-facture-recap-journee',
  templateUrl: './facture-recap-journee.component.html',
  styleUrls: ['./facture-recap-journee.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule, AppCurrencyPipe,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonSpinner,
    IonRefresher, IonRefresherContent,
  ],
})
export class FactureRecapJourneeComponent implements OnInit, OnDestroy {
  selectedDate: string = new Date().toISOString().split('T')[0];
  recap: DailyRecap | null = null;
  currentClosure: DailyCashClosure | null = null;
  isLoading = false;
  isExporting = false;
  isPrintingZ = false;
  isExportingFec = false;

  private readonly destroy$ = new Subject<void>();
  private readonly factureService = inject(FactureService);
  private readonly printerService = inject(PrinterService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    addIcons({
      downloadOutline, printOutline, calendarOutline, cashOutline,
      cardOutline, receiptOutline, peopleOutline, trendingUpOutline, refreshOutline,
      lockClosedOutline, shieldCheckmarkOutline, documentTextOutline, copyOutline
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches both the daily closing financial summary report and closure status for the selected date.
   * @param refreshEvent Optional IonRefresher event
   */
  charger(refreshEvent?: any): void {
    this.isLoading = true;

    // 1. Fetch daily financial recap
    this.factureService.getDailyRecap(this.selectedDate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          if (refreshEvent) safeCompleteRefresher(refreshEvent);
        })
      )
      .subscribe({
        next: data => (this.recap = data),
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('RECAP.ERROR_FETCH'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        }
      });

    // 2. Fetch closure status for selected date
    this.factureService.getClotureByDate(this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: closure => (this.currentClosure = closure),
        error: () => (this.currentClosure = null)
      });
  }

  /**
   * Opens the multi-step cash register closure wizard.
   */
  async openClotureModal(): Promise<void> {
    if (!this.recap) return;

    const modal = await this.modalCtrl.create({
      component: ClotureCaisseModalComponent,
      componentProps: {
        date: this.selectedDate,
        recap: this.recap
      },
      backdropDismiss: false
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.closed) {
      this.charger();
    }
  }

  /**
   * Triggers download of the Z-Report PDF document for the current selected date.
   */
  exportPdf(): void {
    if (this.currentClosure) {
      this.downloadZReportPdf();
      return;
    }

    this.isExporting = true;
    this.factureService.downloadDailyRecapPdf(this.selectedDate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isExporting = false))
      )
      .subscribe({
        next: async (blob: Blob) => {
          this.triggerBlobDownload(blob, `recap-caisse-${this.selectedDate}.pdf`);
          this.showToast(this.transloco.translate('RECAP.EXPORT_SUCCESS'), 'success');
        },
        error: async () => {
          this.showToast(this.transloco.translate('RECAP.EXPORT_ERROR'), 'danger');
        }
      });
  }

  /**
   * Prints 80mm Z-report ticket for current closure.
   */
  printZReportTicket(): void {
    if (!this.currentClosure) return;
    this.isPrintingZ = true;
    this.printerService.printZReport(this.currentClosure.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isPrintingZ = false))
      )
      .subscribe({
        next: res => {
          const key = res.success ? 'CLOTURE.PRINT_SUCCESS' : 'CLOTURE.PRINT_FAILED';
          const color = res.success ? 'success' : 'warning';
          this.showToast(this.transloco.translate(key), color);
        },
        error: () => this.showToast(this.transloco.translate('CLOTURE.PRINT_FAILED'), 'danger')
      });
  }

  /**
   * Downloads official certified Z-Report PDF for current closure.
   */
  downloadZReportPdf(): void {
    if (!this.currentClosure) return;
    this.isExporting = true;
    this.factureService.downloadZReportPdf(this.currentClosure.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isExporting = false))
      )
      .subscribe({
        next: blob => {
          this.triggerBlobDownload(blob, `ticket-z-${this.currentClosure?.closureNumber}.pdf`);
          this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_PDF_SUCCESS'), 'success');
        },
        error: () => this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_PDF_ERROR'), 'danger')
      });
  }

  /**
   * Downloads French FEC accounting export for current closure.
   */
  downloadFecExport(): void {
    if (!this.currentClosure) return;
    this.isExportingFec = true;
    this.factureService.downloadFecExport(this.currentClosure.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isExportingFec = false))
      )
      .subscribe({
        next: blob => {
          this.triggerBlobDownload(blob, `FEC-${this.currentClosure?.closureNumber}.txt`);
          this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_FEC_SUCCESS'), 'success');
        },
        error: () => this.showToast(this.transloco.translate('CLOTURE.DOWNLOAD_FEC_ERROR'), 'danger')
      });
  }

  /**
   * Copies SHA-256 seal to clipboard.
   */
  copySealHash(): void {
    if (this.currentClosure?.sha256Hash) {
      navigator.clipboard.writeText(this.currentClosure.sha256Hash);
      this.showToast(this.transloco.translate('CLOTURE.HASH_COPIED'), 'success');
    }
  }

  /**
   * Handles date picker input changes and reloads summary.
   */
  onDateChange(event: any): void {
    const val = event.target.value;
    if (val) {
      this.selectedDate = val;
      this.charger();
    }
  }

  onRefresh(event: any): void {
    this.charger(event);
  }

  /**
   * Resolves Ionic color for payment mode badge.
   */
  getPaymentModeColor(mode: string): string {
    switch (mode?.toUpperCase()) {
      case 'CARTE': return 'primary';
      case 'ESPECES': return 'success';
      case 'CHECK':
      case 'CHEQUE': return 'warning';
      case 'AVOIR': return 'tertiary';
      default: return 'medium';
    }
  }

  /**
   * Calculates payment mode percentage relative to total revenue.
   */
  getPaymentModePercentage(pm: PaymentModeSummary): number {
    if (!this.recap?.totalCaTtc || this.recap.totalCaTtc <= 0) return 0;
    return Math.round((pm.totalTtc / this.recap.totalCaTtc) * 100);
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
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
