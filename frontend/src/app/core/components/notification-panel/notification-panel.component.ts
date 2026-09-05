import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Optional } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IonButton, IonIcon, PopoverController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline,
  notificationsOffOutline,
  notificationsOutline,
  closeOutline,
  alertCircleOutline,
  warningOutline,
  restaurantOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { NotificationService, AppNotification } from '../../services/notification.service';

/**
 * Side drawer panel component for displaying notifications dynamically.
 * Styled with OpenBar Design System CSS variables to support theme switching.
 */
@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    UpperCasePipe,
    TranslocoPipe,
    IonButton,
    IonIcon,
  ],
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss'],
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  /** Whether the notification drawer panel is currently open. */
  @Input() isOpen = false;

  /** Event emitted when closing the panel. */
  @Output() closePanel = new EventEmitter<void>();

  /** Current list of notifications displayed in the panel. */
  notifications: AppNotification[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly notifService: NotificationService,
    @Optional() private readonly popoverCtrl?: PopoverController,
  ) {
    addIcons({
      checkmarkDoneOutline,
      notificationsOffOutline,
      notificationsOutline,
      closeOutline,
      alertCircleOutline,
      warningOutline,
      restaurantOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    this.notifications = this.notifService.getHistory();
    this.notifService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications = this.notifService.getHistory();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Marks all notifications as read and closes the panel.
   */
  marquerToutLu(): void {
    this.notifService.marquerToutLu();
    this.notifications = this.notifService.getHistory();
    this.fermer();
  }

  /**
   * Marks a single notification as read by its identifier.
   *
   * @param id - Notification identifier.
   */
  marquerLue(id: string): void {
    this.notifService.marquerLue(id);
    this.notifications = this.notifService.getHistory();
  }

  /**
   * Closes the notification panel and dismisses popovers if applicable.
   */
  fermer(): void {
    this.closePanel.emit();
    if (this.popoverCtrl) {
      this.popoverCtrl.dismiss().catch(() => {/* fallback when not in popover */});
    }
  }

  /**
   * Returns the color variant string associated with a notification type.
   *
   * @param type - Notification type.
   * @returns Color token name.
   */
  typeCouleur(type: string): string {
    const map: Record<string, string> = {
      commande: 'primary',
      statut: 'success',
      table: 'warning',
      stock: 'danger',
    };
    return map[type] ?? 'medium';
  }

  /**
   * Returns the Ionic icon name matching a notification type.
   *
   * @param type - Notification type.
   * @returns Icon name string.
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'stock':
        return 'alert-circle-outline';
      case 'commande':
        return 'restaurant-outline';
      case 'statut':
        return 'checkmark-circle-outline';
      case 'table':
        return 'warning-outline';
      default:
        return 'notifications-outline';
    }
  }
}
