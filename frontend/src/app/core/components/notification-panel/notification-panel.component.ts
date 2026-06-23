import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon,
  IonHeader, IonToolbar, IonTitle, IonContent, IonNote,
  PopoverController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, notificationsOffOutline } from 'ionicons/icons';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon,
    IonHeader, IonToolbar, IonTitle, IonContent, IonNote,
  ],
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss'],
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private notifService: NotificationService,
    private popoverCtrl: PopoverController,
  ) {
    addIcons({ checkmarkDoneOutline, notificationsOffOutline });
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
  }

  marquerLue(id: string) {
    this.notifService.marquerLue(id);
    this.notifications = this.notifService.getHistory();
  }

  fermer() {
    this.popoverCtrl.dismiss();
  }

  typeCouleur(type: string): string {
    const map: Record<string, string> = {
      commande: 'primary', statut: 'success', table: 'warning', stock: 'danger',
    };
    return map[type] ?? 'medium';
  }
}
