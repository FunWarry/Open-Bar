import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonRefresher, IonRefresherContent,
  IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonBadge,
} from '@ionic/angular/standalone';
import { StatCardComponent } from '../../core/components/ui/stat-card/stat-card.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../core/components/ui/empty-state/empty-state.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { DashboardManagerService } from './services/dashboard-manager.service';
import { DashboardStats, TopCocktail } from './models/dashboard-stats.model';
import { OngoingOrder } from './models/ongoing-order.model';

@Component({
  selector: 'app-dashboard-manager',
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonRefresher, IonRefresherContent,
    IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonBadge,
    StatCardComponent,
    RoleBadgeComponent,
    EmptyStateComponent,
    KanbanBoardComponent,
  ],
  templateUrl: './dashboard-manager.component.html',
  styleUrls: ['./dashboard-manager.component.scss'],
})
export class DashboardManagerComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  ongoingOrders: OngoingOrder[] = [];
  loading = true;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly dashboardService: DashboardManagerService) {}

  static readonly REFRESH_INTERVAL_MS = 30_000;

  ngOnInit() {
    this.chargerStats();
    this.chargerOrders();
    // Polling automatique toutes les 30s
    timer(DashboardManagerComponent.REFRESH_INTERVAL_MS, DashboardManagerComponent.REFRESH_INTERVAL_MS).pipe(
      switchMap(() => this.dashboardService.getStats()),
      takeUntil(this.destroy$),
    ).subscribe({
      next: stats => { this.stats = stats; },
      error: () => {},
    });
    // Polling orders toutes les 30s
    timer(DashboardManagerComponent.REFRESH_INTERVAL_MS, DashboardManagerComponent.REFRESH_INTERVAL_MS).pipe(
      switchMap(() => this.dashboardService.getOngoingOrders()),
      takeUntil(this.destroy$),
    ).subscribe({
      next: orders => { this.ongoingOrders = orders; },
      error: () => {},
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerStats() {
    this.loading = true;
    this.dashboardService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
         next: stats => { this.stats = stats; this.loading = false; },
         error: () => { this.loading = false; this.stats = null; this.ongoingOrders = []; },
      });
  }

  chargerOrders() {
    this.dashboardService.getOngoingOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: orders => this.ongoingOrders = orders,
        error: () => this.ongoingOrders = [],
      });
  }

  onRefresh(event: any) {
    this.dashboardService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => { this.stats = stats; event.target.complete(); },
        error: () => event.target.complete(),
      });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val ?? 0);
  }

  getRankLabel(index: number): string {
    return index === 0 ? '1' : index === 1 ? '2' : '3';
  }

  /** Largeur de barre en % par rapport au max (cocktail[0]) */
  getBarWidth(cocktail: TopCocktail): number {
    if (!this.stats || !this.stats.topCocktails.length) return 0;
    const max = this.stats.topCocktails[0].nombreCommandes;
    if (max === 0) return 0;
    return Math.round((cocktail.nombreCommandes / max) * 100);
  }

  trackByCocktailId(_: number, item: TopCocktail): number {
    return item.cocktailId;
  }
}
