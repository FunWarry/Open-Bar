import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline, alertCircleOutline, warningOutline,
  informationCircleOutline, closeOutline
} from 'ionicons/icons';

export type ToastSeverity = 'success' | 'warning' | 'danger' | 'info';

/**
 * Atomic Feedback Toast notification banner component conforming to Figma Design System Toast (ID 536:928).
 *
 * Supports 4 severity types (Success, Warning, Danger/Error, Info) with icon indicators.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent {
  /** Notification message content text. */
  @Input() message!: string;

  /** Toast severity level. */
  @Input() severity: ToastSeverity = 'info';

  /** Whether a close button is displayed on the toast banner. */
  @Input() dismissible = true;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'toast-banner';

  /** Event emitted when the toast is manually dismissed. */
  @Output() dismissed = new EventEmitter<void>();

  constructor() {
    addIcons({
      checkmarkCircleOutline, alertCircleOutline, warningOutline,
      informationCircleOutline, closeOutline
    });
  }

  /** Gets the corresponding Ionicon icon name for the current severity. */
  get severityIcon(): string {
    switch (this.severity) {
      case 'success': return 'checkmark-circle-outline';
      case 'danger': return 'alert-circle-outline';
      case 'warning': return 'warning-outline';
      case 'info': default: return 'information-circle-outline';
    }
  }

  /** Dismisses the toast. */
  onClose(): void {
    this.dismissed.emit();
  }
}
