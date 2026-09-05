import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertOutline,
  alertCircleOutline,
  trashOutline,
  closeOutline,
  logOutOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

// Register icons at module load time
addIcons({
  alertOutline,
  alertCircleOutline,
  trashOutline,
  closeOutline,
  logOutOutline,
  informationCircleOutline
});

/**
 * Metadata pill displayed below modal title.
 */
export interface ConfirmModalMetaTag {
  icon?: string;
  text: string;
}

/**
 * Dialog result when modal is dismissed.
 */
export interface ConfirmModalResult {
  confirmed: boolean;
}

/**
 * Universal, theme-adaptive confirmation & unsaved changes modal for OpenBar.
 * Matches OpenBar Figma Design System with animated glow badge, callout banner, and action buttons.
 */
@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    TranslocoPipe
  ]
})
export class ConfirmModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  /** Main title displayed in header. */
  @Input() title = '';

  /** Message body displayed in callout banner. */
  @Input() message = '';

  /** Ionic icon name for badge and callout. */
  @Input() icon = 'alert-circle-outline';

  /** Visual tone of the dialog. */
  @Input() tone: 'warning' | 'danger' | 'info' = 'warning';

  /** Cancel / Stay button label. */
  @Input() cancelBtnText?: string;

  /** Confirm / Leave button label. */
  @Input() confirmBtnText?: string;

  /** Optional metadata pills below title. */
  @Input() metaTags: ConfirmModalMetaTag[] = [];

  /**
   * Returns the icon name for the header badge and callout banner.
   */
  get badgeIconName(): string {
    if (this.icon && this.icon.length > 0 && this.icon !== 'warning-outline') {
      return this.icon;
    }
    if (this.tone === 'info') {
      return 'information-circle-outline';
    }
    return 'alert-circle-outline';
  }

  /**
   * Returns the action button icon name.
   */
  get actionIconName(): string {
    if (this.tone === 'danger') {
      return this.confirmBtnText?.toLowerCase().includes('supprimer') || this.confirmBtnText?.toLowerCase().includes('delete')
        ? 'trash-outline'
        : 'log-out-outline';
    }
    if (this.tone === 'info') {
      return 'information-circle-outline';
    }
    return 'log-out-outline';
  }

  constructor() {
    addIcons({
      alertOutline,
      alertCircleOutline,
      trashOutline,
      closeOutline,
      logOutOutline,
      informationCircleOutline
    });
  }

  /**
   * Confirms dialog action and dismisses modal with confirmed = true.
   */
  async onConfirm(): Promise<void> {
    await this.modalCtrl.dismiss({ confirmed: true } satisfies ConfirmModalResult);
  }

  /**
   * Cancels dialog and dismisses modal with confirmed = false.
   */
  async onCancel(): Promise<void> {
    await this.modalCtrl.dismiss({ confirmed: false } satisfies ConfirmModalResult);
  }
}
