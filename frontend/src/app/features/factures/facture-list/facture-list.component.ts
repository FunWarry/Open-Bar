import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import { AppCurrencyPipe } from '../../../core/pipes/app-currency.pipe';
import {
  IonContent, IonSearchbar, IonButton,
  IonRefresher, IonRefresherContent, IonIcon, IonSpinner, IonProgressBar, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  receiptOutline, documentTextOutline, cashOutline, analyticsOutline,
  searchOutline, filterOutline, chevronForwardOutline, refreshOutline,
  checkmarkCircleOutline, timeOutline, calendarOutline, personOutline,
  gridOutline, listOutline, arrowForwardOutline, copyOutline, cardOutline,
  walletOutline, restaurantOutline, statsChartOutline, checkmarkDoneCircleOutline,
  downloadOutline, alertCircleOutline, swapVerticalOutline, checkmarkOutline,
  closeCircleOutline
} from 'ionicons/icons';

import { FactureService } from '../services/facture.service';
import { Facture } from '../models/facture.model';
import { environment } from '../../../../environments/environment';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

export type FactureFilterStatus = 'ALL' | 'SETTLED' | 'PENDING';
export type FactureSortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'NUMBER';

/**
 * Modern Standalone Component for displaying, searching, filtering, and managing invoices.
 * Conforms to Figma DS (Facturation 626:987) with high-density metrics, card/grid and table views,
 * real-time search, interactive filters, clipboard copy, and dark/light theme support.
 */
@Component({
  selector: 'app-facture-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, AppCurrencyPipe, DatePipe,
    TranslocoModule,
    IonContent, IonSearchbar, IonButton,
    IonRefresher, IonRefresherContent, IonIcon, IonSpinner, IonProgressBar
  ],
  templateUrl: './facture-list.component.html',
  styleUrls: ['./facture-list.component.scss'],
})
export class FactureListComponent implements OnInit, OnDestroy {
  private readonly factureService = inject(FactureService);
  private readonly toastCtrl = inject(ToastController);
  private readonly destroy$ = new Subject<void>();

  factures: Facture[] = [];
  loading = false;
  searchTerm = '';
  activeFilter: FactureFilterStatus = 'ALL';
  sortBy: FactureSortOption = 'DATE_DESC';
  viewMode: 'grid' | 'list' = 'grid';
  copiedInvoiceId: number | null = null;
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    addIcons({
      receiptOutline, documentTextOutline, cashOutline, analyticsOutline,
      searchOutline, filterOutline, chevronForwardOutline, refreshOutline,
      checkmarkCircleOutline, timeOutline, calendarOutline, personOutline,
      gridOutline, listOutline, arrowForwardOutline, copyOutline, cardOutline,
      walletOutline, restaurantOutline, statsChartOutline, checkmarkDoneCircleOutline,
      downloadOutline, alertCircleOutline, swapVerticalOutline, checkmarkOutline,
      closeCircleOutline
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches all invoices from backend API.
   */
  charger(): void {
    this.loading = true;
    this.factureService.getAllFactures()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (f) => {
          this.factures = f ?? [];
        },
        error: () => {
          this.factures = [];
        }
      });
  }

  /**
   * Refresher handler for pull-to-refresh.
   *
   * @param event Custom refresher event
   */
  onRefresh(event: CustomEvent): void {
    this.factureService.getAllFactures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (f) => {
          this.factures = f ?? [];
          safeCompleteRefresher(event);
        },
        error: () => safeCompleteRefresher(event)
      });
  }

  /**
   * Computes the grand total revenue (TTC) of all loaded invoices.
   */
  get totalCA(): number {
    return this.factures.reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  /**
   * Computes the settled total revenue (TTC).
   */
  get totalSettledCA(): number {
    return this.factures
      .filter(f => f.reglee)
      .reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  /**
   * Computes the pending total revenue (TTC).
   */
  get totalPendingCA(): number {
    return this.factures
      .filter(f => !f.reglee)
      .reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  /**
   * Returns count of settled invoices.
   */
  get settledCount(): number {
    return this.factures.filter(f => f.reglee).length;
  }

  /**
   * Returns count of pending invoices.
   */
  get pendingCount(): number {
    return this.factures.filter(f => !f.reglee).length;
  }

  /**
   * Returns percentage of settled invoices (0 to 100).
   */
  get settledRate(): number {
    if (this.factures.length === 0) return 0;
    return Math.round((this.settledCount / this.factures.length) * 100);
  }

  /**
   * Returns ratio of settled invoices (0 to 1) for progress bars.
   */
  get settledRatio(): number {
    if (this.factures.length === 0) return 0;
    return this.settledCount / this.factures.length;
  }

  /**
   * Filters and sorts the invoice list according to search term, status filter, and sort option.
   */
  get filteredFactures(): Facture[] {
    let result = [...this.factures];

    // Status filter
    if (this.activeFilter === 'SETTLED') {
      result = result.filter(f => f.reglee);
    } else if (this.activeFilter === 'PENDING') {
      result = result.filter(f => !f.reglee);
    }

    // Search query filter
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      result = result.filter(f =>
        Boolean(f.numero?.toLowerCase().includes(q)) ||
        Boolean(f.tableNumero?.toString().includes(q)) ||
        Boolean(f.serveurNom?.toLowerCase().includes(q)) ||
        Boolean(f.modePaiement?.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (this.sortBy) {
        case 'DATE_ASC': {
          const timeA = a.dateFacture ? new Date(a.dateFacture).getTime() : 0;
          const timeB = b.dateFacture ? new Date(b.dateFacture).getTime() : 0;
          return timeA - timeB;
        }
        case 'AMOUNT_DESC': {
          const amountA = a.totalTTC ?? a.total ?? 0;
          const amountB = b.totalTTC ?? b.total ?? 0;
          return amountB - amountA;
        }
        case 'AMOUNT_ASC': {
          const amountA = a.totalTTC ?? a.total ?? 0;
          const amountB = b.totalTTC ?? b.total ?? 0;
          return amountA - amountB;
        }
        case 'NUMBER': {
          return (a.numero ?? '').localeCompare(b.numero ?? '');
        }
        case 'DATE_DESC':
        default: {
          const timeA = a.dateFacture ? new Date(a.dateFacture).getTime() : 0;
          const timeB = b.dateFacture ? new Date(b.dateFacture).getTime() : 0;
          return timeB - timeA;
        }
      }
    });

    return result;
  }

  /**
   * Sets active status filter.
   *
   * @param status Filter status
   */
  setFilter(status: FactureFilterStatus): void {
    this.activeFilter = status;
  }

  /**
   * Sets active sort option.
   *
   * @param sort Sort option
   */
  setSort(sort: FactureSortOption): void {
    this.sortBy = sort;
  }

  /**
   * Switches display mode (cards vs tabular list).
   *
   * @param mode View mode ('grid' | 'list')
   */
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  /**
   * Resets all search and filter parameters to default.
   */
  resetFilters(): void {
    this.searchTerm = '';
    this.activeFilter = 'ALL';
    this.sortBy = 'DATE_DESC';
  }

  /**
   * Returns Ionic color name based on settlement status.
   *
   * @param reglee Boolean whether invoice is settled
   */
  statutColor(reglee: boolean): string {
    return reglee ? 'success' : 'warning';
  }

  /**
   * Returns an icon name for payment mode display.
   *
   * @param mode Optional payment mode string
   */
  getPaymentModeIcon(mode?: string): string {
    if (!mode) return 'card-outline';
    const m = mode.toUpperCase();
    if (m.includes('ESP') || m.includes('CASH')) return 'cash-outline';
    if (m.includes('TICKET') || m.includes('RESTO') || m.includes('MEAL')) return 'wallet-outline';
    return 'card-outline';
  }

  /**
   * Copies invoice number to system clipboard and displays inline indicator.
   *
   * @param event Click event to prevent bubbling
   * @param numero Invoice number
   * @param id Invoice ID
   */
  async copyInvoiceNumber(event: Event, numero: string, id: number): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(numero);
        this.copiedInvoiceId = id;
        if (this.copyTimeout) {
          clearTimeout(this.copyTimeout);
        }
        this.copyTimeout = setTimeout(() => {
          this.copiedInvoiceId = null;
        }, 2000);
      } catch {
        // Fallback silently
      }
    }
  }

  /**
   * Direct PDF download trigger for an invoice.
   *
   * @param event Click event
   * @param id Invoice ID
   */
  downloadPdf(event: Event, id: number): void {
    event.stopPropagation();
    event.preventDefault();
    window.open(`${environment.apiUrl}/factures/${id}/pdf`, '_blank');
  }

  /**
   * TrackBy function for invoice list rendering optimization.
   */
  trackById(_: number, f: Facture): number {
    return f.id;
  }
}
