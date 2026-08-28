import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonIcon,
  IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trashOutline,
  closeOutline,
  warningOutline,
  alertCircleOutline,
  restaurantOutline,
  peopleOutline,
  locationOutline,
  cubeOutline,
  pricetagOutline
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

export interface ConfirmDeleteMetaTag {
  icon?: string;
  text: string;
}

export interface ConfirmDeleteDetail {
  label: string;
  value: string;
}

export interface ConfirmDeleteResult {
  confirmed: boolean;
}

/**
 * Universal, theme-adaptive confirmation modal for delete operations in OpenBar.
 * Adheres to OpenBar Figma Design System with danger pulse badge, metadata tags,
 * warning callout, details recap, and action buttons.
 */
@Component({
  selector: 'app-confirm-delete-modal',
  templateUrl: './confirm-delete-modal.component.html',
  styleUrls: ['./confirm-delete-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    IonSpinner,
    TranslocoPipe
  ]
})
export class ConfirmDeleteModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly transloco = inject(TranslocoService);

  /** Main title displayed in header. */
  @Input() title = '';

  /** Highlighted item name/identifier (e.g., "Table 999", "Mojito"). */
  @Input() itemName = '';

  /** Metadata pills under the title. */
  @Input() metaTags: ConfirmDeleteMetaTag[] = [];

  /** Warning message displayed in the warning callout banner. */
  @Input() warningMessage = '';

  /** Optional list of key-value details shown in the recap card. */
  @Input() detailsSummary: ConfirmDeleteDetail[] = [];

  /** If set, blocks deletion and shows an error banner (e.g. active orders). */
  @Input() cannotDeleteReason?: string | null = null;

  /** Custom confirm button label. */
  @Input() confirmBtnText?: string;

  /** True while the delete API call is in flight. */
  @Input() isDeleting = false;

  constructor() {
    addIcons({
      trashOutline,
      closeOutline,
      warningOutline,
      alertCircleOutline,
      restaurantOutline,
      peopleOutline,
      locationOutline,
      cubeOutline,
      pricetagOutline
    });
  }

  async onConfirm(): Promise<void> {
    if (this.cannotDeleteReason || this.isDeleting) return;
    await this.modalCtrl.dismiss({ confirmed: true });
  }

  async onCancel(): Promise<void> {
    await this.modalCtrl.dismiss({ confirmed: false });
  }
}
