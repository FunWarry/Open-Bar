import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IonButton, IonIcon, PopoverController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, notificationsOffOutline, notificationsOutline, closeOutline } from 'ionicons/icons';
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
    IonButton, IonIcon,
  ],
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss'],
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();

  notifications: AppNotification[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly notifService: NotificationService,
    @Optional() private readonly popoverCtrl?: PopoverController,
  ) {
    addIcons({ checkmarkDoneOutline, notificationsOffOutline, notificationsOutline, closeOutline });
  }

  ngOnInit() {
    this.notifications = this.notifService.getHistory();
    this.notifService.onNotification()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications = this.notifService.getHistory();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  marquerToutLu() {
    this.notifService.marquerToutLu();
    this.notifications = this.notifService.getHistory();
    this.fermer();
  }

  marquerLue(id: string) {
    this.notifService.marquerLue(id);
    this.notifications = this.notifService.getHistory();
  }

  fermer() {
    this.closePanel.emit();
    if (this.popoverCtrl) {
      this.popoverCtrl.dismiss().catch(() => {/* fallback when not in popover */});
    }
  }

  typeCouleur(type: string): string {
    const map: Record<string, string> = {
      commande: 'primary', statut: 'success', table: 'warning', stock: 'danger',
    };
    return map[type] ?? 'medium';
  }
}
