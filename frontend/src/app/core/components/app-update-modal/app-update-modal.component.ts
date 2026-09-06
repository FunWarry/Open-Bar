import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  IonFooter,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudDownloadOutline,
  closeOutline,
  timeOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  sparklesOutline
} from 'ionicons/icons';
import { TranslocoModule } from '@jsverse/transloco';
import { OfficialReleaseInfo } from '../../models/app-update.model';
import { AppUpdateService } from '../../services/app-update.service';

/**
 * Interactive dialog presented to Managers and Admins when a new official OpenBar release is detected.
 * <p>
 * Displays current vs. latest release version, release title, changelog / release notes,
 * an action button to initiate the update workflow, and an option to postpone (snooze) the alert.
 */
@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonBadge,
    IonFooter
  ],
  templateUrl: './app-update-modal.component.html',
  styleUrls: ['./app-update-modal.component.scss']
})
export class AppUpdateModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly appUpdateService = inject(AppUpdateService);

  /** Currently running application version (e.g. '1.0.0'). */
  @Input() currentVersion = '1.0.0';

  /** Metadata for the latest official release detected. */
  @Input() latestRelease!: OfficialReleaseInfo;

  /** Flag indicating whether the upgrade operation is currently running. */
  isUpgrading = false;

  constructor() {
    addIcons({
      cloudDownloadOutline,
      closeOutline,
      timeOutline,
      arrowForwardOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      sparklesOutline
    });
  }

  /**
   * Closes the update modal without applying any snooze.
   */
  async close(): Promise<void> {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  /**
   * Snoozes the update prompt for the current release version for 24 hours
   * and dismisses the dialog.
   */
  async snooze(): Promise<void> {
    if (this.latestRelease?.version) {
      this.appUpdateService.snoozeUpdate(this.latestRelease.version);
    }
    await this.modalCtrl.dismiss(null, 'snooze');
  }

  /**
   * Initiates the system upgrade workflow and dismisses the modal.
   */
  async upgrade(): Promise<void> {
    if (this.isUpgrading) {
      return;
    }
    this.isUpgrading = true;
    try {
      await this.appUpdateService.triggerUpdate(this.latestRelease);
      await this.modalCtrl.dismiss({ upgraded: true, release: this.latestRelease }, 'upgrade');
    } finally {
      this.isUpgrading = false;
    }
  }
}
