import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonSpinner,
  IonRefresher, IonRefresherContent, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline, printOutline, calendarOutline, cashOutline,
  cardOutline, receiptOutline, peopleOutline, trendingUpOutline, refreshOutline
} from 'ionicons/icons';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FactureService } from '../../../core/services/facture.service';
import { DailyRecap, PaymentModeSummary } from '../../../core/models/daily-recap.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

/**
 * Daily Sales Closing Summary component (Z-Report) for Managers in OpenBar (Figma 628:1096).
 * Provides daily revenue KPIs, VAT rate breakdowns, payment mode breakdowns, date picking,
 * and PDF export / printing functionality.
 */
@Component({
  selector: 'app-facture-recap-journee',
  templateUrl: './facture-recap-journee.component.html',
  styleUrls: ['./facture-recap-journee.component.css'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonSpinner,
    IonRefresher, IonRefresherContent,
  ],
})
export class FactureRecapJourneeComponent implements OnInit, OnDestroy {
  selectedDate: string = new Date().toISOString().split('T')[0];
  recap: DailyRecap | null = null;
  isLoading = false;
  isExporting = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly factureService: FactureService,
    private readonly toastCtrl: ToastController,
    private readonly transloco: TranslocoService,
  ) {
    addIcons({
      downloadOutline, printOutline, calendarOutline, cashOutline,
      cardOutline, receiptOutline, peopleOutline, trendingUpOutline, refreshOutline
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
   * Fetches the daily closing financial summary report for the selected date.
   * @param refreshEvent Optional IonRefresher event
   */
  charger(refreshEvent?: any): void {
    this.isLoading = true;
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
  }

  /**
   * Triggers download of the Z-Report PDF document for the current selected date.
   */
  exportPdf(): void {
    this.isExporting = true;
    this.factureService.downloadDailyRecapPdf(this.selectedDate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isExporting = false))
      )
      .subscribe({
        next: async (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `recap-caisse-${this.selectedDate}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);

          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('RECAP.EXPORT_SUCCESS'),
            duration: 2000,
            color: 'success',
          });
          toast.present();
        },
        error: async () => {
          const toast = await this.toastCtrl.create({
            message: this.transloco.translate('RECAP.EXPORT_ERROR'),
            duration: 3000,
            color: 'danger',
          });
          toast.present();
        }
      });
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
}
