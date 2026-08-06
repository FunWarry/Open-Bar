import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';
import {
  IonContent, IonCard, IonSearchbar, IonSegment, IonSegmentButton, IonBadge, IonButton,
  IonRefresher, IonRefresherContent, IonIcon, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  receiptOutline, documentTextOutline, cashOutline, analyticsOutline,
  searchOutline, filterOutline, chevronForwardOutline, refreshOutline,
  checkmarkCircleOutline, timeOutline, calendarOutline, personOutline
} from 'ionicons/icons';

import { FactureService } from '../services/facture.service';
import { Facture } from '../models/facture.model';
import { safeCompleteRefresher } from '../../../core/utils/refresher-utils';

export type FactureFilterStatus = 'ALL' | 'SETTLED' | 'PENDING';

/**
 * Modern Standalone Component for displaying, searching, and filtering invoice history.
 * Features KPI summary cards, dynamic search bar, status segment filters, and theme adaptation.
 */
@Component({
  selector: 'app-facture-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, CurrencyPipe, DatePipe,
    TranslocoModule,
    IonContent, IonCard, IonSearchbar, IonSegment, IonSegmentButton, IonBadge, IonButton,
    IonRefresher, IonRefresherContent, IonIcon, IonSpinner
  ],
  templateUrl: './facture-list.component.html',
  styleUrls: ['./facture-list.component.scss'],
})
export class FactureListComponent implements OnInit, OnDestroy {
  private readonly factureService = inject(FactureService);
  private readonly destroy$ = new Subject<void>();

  factures: Facture[] = [];
  loading = false;
  searchTerm = '';
  activeFilter: FactureFilterStatus = 'ALL';

  constructor() {
    addIcons({
      receiptOutline, documentTextOutline, cashOutline, analyticsOutline,
      searchOutline, filterOutline, chevronForwardOutline, refreshOutline,
      checkmarkCircleOutline, timeOutline, calendarOutline, personOutline
    });
  }

  ngOnInit(): void {
    this.charger();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  get totalCA(): number {
    return this.factures.reduce((acc, f) => acc + (f.totalTTC ?? f.total ?? 0), 0);
  }

  get settledCount(): number {
    return this.factures.filter(f => f.reglee).length;
  }

  get settledRate(): number {
    if (this.factures.length === 0) return 0;
    return Math.round((this.settledCount / this.factures.length) * 100);
  }

  get filteredFactures(): Facture[] {
    let result = [...this.factures];

    if (this.activeFilter === 'SETTLED') {
      result = result.filter(f => f.reglee);
    } else if (this.activeFilter === 'PENDING') {
      result = result.filter(f => !f.reglee);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      result = result.filter(f =>
        Boolean(f.numero?.toLowerCase().includes(q)) ||
        Boolean(f.tableNumero?.toString().includes(q)) ||
        Boolean(f.serveurNom?.toLowerCase().includes(q))
      );
    }

    return result;
  }

  setFilter(status: FactureFilterStatus): void {
    this.activeFilter = status;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.activeFilter = 'ALL';
  }

  statutColor(reglee: boolean): string {
    return reglee ? 'success' : 'warning';
  }

  trackById(_: number, f: Facture): number {
    return f.id;
  }
}
