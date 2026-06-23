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
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { DashboardManagerService } from './services/dashboard-manager.service';
import { DashboardStats, TopCocktail } from './models/dashboard-stats.model';

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
  ],
  templateUrl: './dashboard-manager.component.html',
  styleUrls: ['./dashboard-manager.component.scss'],
})
export class DashboardManagerComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private dashboardService: DashboardManagerService) {}

  static readonly REFRESH_INTERVAL_MS = 30_000;

  ngOnInit() {
    this.chargerStats();
    // Polling automatique toutes les 30s
    timer(DashboardManagerComponent.REFRESH_INTERVAL_MS, DashboardManagerComponent.REFRESH_INTERVAL_MS).pipe(
      switchMap(() => this.dashboardService.getStats()),
      takeUntil(this.destroy$),
    ).subscribe({
      next: stats => { this.stats = stats; },
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
        error: () => { this.loading = false; },
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
