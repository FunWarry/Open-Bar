import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { warningOutline, checkmarkOutline, alertCircleOutline } from 'ionicons/icons';
import { SafetyAlertService } from '../../../services/safety-alert.service';
import { AuthService } from '../../../services/auth.service';
import { ActionButtonComponent } from '../action-button/action-button.component';
import { SafetyAlert } from '../../../models/safety-alert.model';

/**
 * Universal sticky emergency banner component for waitstaff and bartender tablets.
 * Displays high-priority Angel Shot safety alerts with animated pulse and one-tap acknowledgement.
 */
@Component({
  selector: 'app-safety-alert-banner',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TranslocoPipe,
    IonIcon,
    ActionButtonComponent
  ],
  templateUrl: './safety-alert-banner.component.html',
  styleUrls: ['./safety-alert-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SafetyAlertBannerComponent {
  readonly safetyAlertService = inject(SafetyAlertService);
  private readonly authService = inject(AuthService, { optional: true });

  constructor() {
    addIcons({ warningOutline, checkmarkOutline, alertCircleOutline });
  }

  /**
   * Returns active emergency safety alerts.
   */
  get activeAlerts(): SafetyAlert[] {
    return this.safetyAlertService.activeAlerts();
  }

  /**
   * Resolves and acknowledges an active emergency alert.
   *
   * @param alert Active safety alert to mark resolved
   */
  resolveAlert(alert: SafetyAlert): void {
    const user = this.authService?.getStoredUser();
    const resolvedBy = user?.username || 'Staff';
    this.safetyAlertService.resolveAlert(alert.id, resolvedBy).subscribe();
  }
}
