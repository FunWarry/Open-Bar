import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { TranslocoModule } from '@jsverse/transloco';
import { StartupReadinessService } from '../../services/startup-readiness.service';
import { ActionButtonComponent } from '../ui/action-button/action-button.component';

/**
 * Startup waiting screen overlay displayed strictly during initial application cold-boot.
 * <p>
 * Displays real-time connection status and animated progress indicators while the backend
 * and PostgreSQL containers are finishing their initialization. Automatically dismisses once
 * readiness is confirmed.
 */
@Component({
  selector: 'app-startup-overlay',
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner, TranslocoModule, ActionButtonComponent],
  templateUrl: './startup-overlay.component.html',
  styleUrls: ['./startup-overlay.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class StartupOverlayComponent {
  readonly startupService = inject(StartupReadinessService);

  /**
   * Triggers an immediate retry probe via the startup service.
   */
  onRetry(): void {
    this.startupService.retryNow();
  }
}
