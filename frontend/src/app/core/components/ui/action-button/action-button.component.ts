import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'edit' | 'mark';
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Action Button component conforming to Figma Design System ActionButton (ID 374:210).
 *
 * Supports multiple style variants (primary, secondary, ghost, danger, edit, mark) and sizes.
 */
@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [IonIcon, IonSpinner, NgClass],
  templateUrl: './action-button.component.html',
  styleUrls: ['./action-button.component.css']
})
export class ActionButtonComponent {
  /** Button style variant. */
  @Input() variant: ButtonVariant = 'primary';

  /** Button size ('small', 'medium', 'large'). */
  @Input() size: ButtonSize = 'medium';

  /** Optional Ionicon icon identifier. */
  @Input() icon?: string;

  /** Slot position for the icon. */
  @Input() iconSlot: 'start' | 'end' | 'icon-only' = 'start';

  /** Whether the button is disabled. */
  @Input() disabled = false;

  /** Whether the button is in loading state (displays a spinner). */
  @Input() loading = false;

  /** HTML button element type attribute. */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  /** Optional expand layout attribute ('block' or 'full'). */
  @Input() expand?: 'block' | 'full';

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'action-button';

  /** Event emitted when the button is clicked and not disabled or loading. */
  @Output() btnClick = new EventEmitter<Event>();

  /** Click handler. */
  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit(event);
    }
  }

  get colorAttr(): string | undefined {
    if (this.variant === 'danger') return 'danger';
    if (this.variant === 'primary') return 'primary';
    return undefined;
  }

  get fillAttr(): 'solid' | 'outline' | 'clear' {
    if (this.variant === 'ghost') return 'clear';
    if (this.variant === 'secondary' || this.variant === 'edit') return 'outline';
    return 'solid';
  }
}
