import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
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
import { SearchableSelectComponent, SearchableOption } from '../../../core/components/ui/searchable-select/searchable-select.component';

export type FactureFilterStatus = 'ALL' | 'SETTLED' | 'PENDING';
export type FactureSortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'NUMBER';
export type FacturePeriodMode = 'ALL_TIME' | 'OPERATIONAL_DAY' | 'WEEK' | 'MONTH';

/**
 * Computes the operational date string (YYYY-MM-DD) for a given date,
 * shifting 00:00-04:59 to previous day (shift 05h00 -> 05h00 J+1).
 */
export function getOperationalDayString(d: Date = new Date()): string {
  const adjusted = new Date(d);
  if (adjusted.getHours() < 5) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  const year = adjusted.getFullYear();
  const month = String(adjusted.getMonth() + 1).padStart(2, '0');
  const day = String(adjusted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes the ISO week string (YYYY-Www) based on operational day.
 */
export function getIsoWeekString(d: Date = new Date()): string {
  const opDayStr = getOperationalDayString(d);
  const [y, m, day] = opDayStr.split('-').map(Number);
  const target = new Date(y, m - 1, day);
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${y}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Computes the Month string (YYYY-MM) based on operational day.
 */
export function getMonthString(d: Date = new Date()): string {
  const opDayStr = getOperationalDayString(d);
  return opDayStr.substring(0, 7);
}

/**
 * Modern Standalone Component for displaying, searching, filtering, and managing invoices.
 * Conforms to Figma DS (Facturation 626:987) with high-density metrics, card/grid and table views,
 * operational period filtering (05h00 -> 05h00 J+1, week, month), searchable dropdowns, and clipboard copy.
 */
@Component({
  selector: 'app-facture-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, AppCurrencyPipe, DatePipe,
    TranslocoModule,
    IonContent, IonSearchbar, IonButton,
    IonRefresher, IonRefresherContent, IonIcon, IonSpinner, IonProgressBar,
    SearchableSelectComponent
  ],
  templateUrl: './facture-list.component.html',
  styleUrls: ['./facture-list.component.scss'],
})
export class FactureListComponent implements OnInit, OnDestroy {
  private readonly factureService = inject(FactureService);
  private readonly toastCtrl = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroy$ = new Subject<void>();

  factures: Facture[] = [];
  loading = false;
  searchTerm = '';
  activeFilter: FactureFilterStatus = 'ALL';
  sortBy: FactureSortOption = 'DATE_DESC';
  viewMode: 'grid' | 'list' = 'grid';
  copiedInvoiceId: number | null = null;
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  // Period filter state
  periodMode: FacturePeriodMode = 'ALL_TIME';
  selectedDay: string = getOperationalDayString();
  selectedWeek: string = getIsoWeekString();
  selectedMonth: string = getMonthString();

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
   * Checks whether an invoice falls within the active operational period.
   */
  isInvoiceInActivePeriod(facture: Facture): boolean {
    if (this.periodMode === 'ALL_TIME') return true;
    if (!facture.dateFacture) return false;

    const invoiceDate = new Date(facture.dateFacture);
    if (Number.isNaN(invoiceDate.getTime())) return false;

    const invoiceOpDayStr = getOperationalDayString(invoiceDate);

    if (this.periodMode === 'OPERATIONAL_DAY') {
      return invoiceOpDayStr === this.selectedDay;
    }

    if (this.periodMode === 'WEEK') {
      const invoiceWeek = getIsoWeekString(invoiceDate);
      return invoiceWeek === this.selectedWeek;
    }

    if (this.periodMode === 'MONTH') {
      return invoiceOpDayStr.substring(0, 7) === this.selectedMonth;
    }

    return true;
  }

  /**
   * Invoices matching the selected operational period.
   */
  get periodFilteredFactures(): Facture[] {
    return this.factures.filter(f => this.isInvoiceInActivePeriod(f));
  }

  /**
   * Computes the grand total revenue (TTC) of invoices in active period.
   */
  get totalCA(): number {
    return this.periodFilteredFactures.reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  /**
   * Computes the settled total revenue (TTC) in active period.
   */
  get totalSettledCA(): number {
    return this.periodFilteredFactures
      .filter(f => f.reglee)
      .reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  /**
   * Computes the pending total revenue (TTC) in active period.
   */
  get totalPendingCA(): number {
    return this.periodFilteredFactures
      .filter(f => !f.reglee)
      .reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  /**
   * Returns total count of invoices in active period.
   */
  get periodTotalCount(): number {
    return this.periodFilteredFactures.length;
  }

  /**
   * Returns count of settled invoices in active period.
   */
  get settledCount(): number {
    return this.periodFilteredFactures.filter(f => f.reglee).length;
  }

  /**
   * Returns count of pending invoices in active period.
   */
  get pendingCount(): number {
    return this.periodFilteredFactures.filter(f => !f.reglee).length;
  }

  /**
   * Returns percentage of settled invoices (0 to 100) in active period.
   */
  get settledRate(): number {
    if (this.periodFilteredFactures.length === 0) return 0;
    return Math.round((this.settledCount / this.periodFilteredFactures.length) * 100);
  }

  /**
   * Returns ratio of settled invoices (0 to 1) for progress bars.
   */
  get settledRatio(): number {
    if (this.periodFilteredFactures.length === 0) return 0;
    return this.settledCount / this.periodFilteredFactures.length;
  }

  /**
   * Options for Sort searchable select dropdown.
   */
  get sortOptions(): SearchableOption<FactureSortOption>[] {
    return [
      { value: 'DATE_DESC', label: this.transloco.translate('FACTURES.SORT.DATE_DESC'), icon: 'time-outline' },
      { value: 'DATE_ASC', label: this.transloco.translate('FACTURES.SORT.DATE_ASC'), icon: 'time-outline' },
      { value: 'AMOUNT_DESC', label: this.transloco.translate('FACTURES.SORT.AMOUNT_DESC'), icon: 'cash-outline' },
      { value: 'AMOUNT_ASC', label: this.transloco.translate('FACTURES.SORT.AMOUNT_ASC'), icon: 'cash-outline' },
      { value: 'NUMBER', label: this.transloco.translate('FACTURES.SORT.NUMBER'), icon: 'receipt-outline' },
    ];
  }

  onSortSelected(option: SearchableOption<FactureSortOption> | null): void {
    if (option?.value) {
      this.sortBy = option.value;
    }
  }

  /**
   * Filters and sorts the invoice list according to period, search term, status filter, and sort option.
   */
  get filteredFactures(): Facture[] {
    let result = [...this.periodFilteredFactures];

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

  setPeriodMode(mode: FacturePeriodMode): void {
    this.periodMode = mode;
  }

  setToday(): void {
    this.periodMode = 'OPERATIONAL_DAY';
    this.selectedDay = getOperationalDayString();
  }

  setYesterday(): void {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    this.periodMode = 'OPERATIONAL_DAY';
    this.selectedDay = getOperationalDayString(d);
  }

  setThisWeek(): void {
    this.periodMode = 'WEEK';
    this.selectedWeek = getIsoWeekString();
  }

  setLastWeek(): void {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    this.periodMode = 'WEEK';
    this.selectedWeek = getIsoWeekString(d);
  }

  setThisMonth(): void {
    this.periodMode = 'MONTH';
    this.selectedMonth = getMonthString();
  }

  setLastMonth(): void {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    this.periodMode = 'MONTH';
    this.selectedMonth = getMonthString(d);
  }

  setAllTime(): void {
    this.periodMode = 'ALL_TIME';
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
