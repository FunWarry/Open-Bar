import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-stock-alert-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-alert-banner.component.html',
  styleUrls: ['./stock-alert-banner.component.scss'],
})
export class StockAlertBannerComponent implements OnInit, OnDestroy {
  stockAlerts: AppNotification[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.onStockAlert()
      .pipe(takeUntil(this.destroy$))
      .subscribe(alert => {
        this.stockAlerts.unshift(alert);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismissAlert(id: string): void {
    this.stockAlerts = this.stockAlerts.filter(a => a.id !== id);
    this.notificationService.marquerLue(id);
  }

  isCritical(alert: AppNotification): boolean {
    return alert.data?.quantiteActuelle === 0;
  }
}
