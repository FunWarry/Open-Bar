import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { timerOutline, sparklesOutline, timeOutline, flameOutline } from 'ionicons/icons';
import { HappyHourService } from '../../../../core/services/happy-hour.service';

/**
 * Dynamic Happy Hour countdown timer banner and upcoming promotion teaser alert
 * for patron QR ordering view.
 * <p>
 * Displays a live glowing countdown when a promotional Happy Hour rule is active,
 * or an informative teaser announcement when Happy Hour begins within 60 minutes.
 */
@Component({
  selector: 'app-happy-hour-banner',
  standalone: true,
  imports: [CommonModule, TranslocoModule, IonIcon],
  templateUrl: './happy-hour-banner.component.html',
  styleUrls: ['./happy-hour-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class HappyHourBannerComponent {
  private readonly happyHourService = inject(HappyHourService);

  /** Active countdown signal from HappyHourService. */
  readonly activeCountdown = this.happyHourService.activeCountdown;

  /** Upcoming teaser signal from HappyHourService. */
  readonly upcomingTeaser = this.happyHourService.upcomingTeaser;

  constructor() {
    addIcons({ timerOutline, sparklesOutline, timeOutline, flameOutline });
  }
}

