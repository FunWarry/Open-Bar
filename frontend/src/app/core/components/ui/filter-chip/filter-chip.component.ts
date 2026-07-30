import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { IonChip, IonIcon, IonLabel } from '@ionic/angular/standalone';

/**
 * Filter Chip component conforming to Figma Design System FilterChip (ID 132:86).
 *
 * Displays a toggleable filter chip with optional icon and active state.
 */
@Component({
  selector: 'app-filter-chip',
  standalone: true,
  imports: [IonChip, IonIcon, IonLabel, NgIf],
  templateUrl: './filter-chip.component.html',
  styleUrls: ['./filter-chip.component.css']
})
export class FilterChipComponent {
  /** Text label displayed on the chip. */
  @Input() label!: string;

  /** Optional Ionicon icon identifier. */
  @Input() icon?: string;

  /** Whether the filter chip is currently active. */
  @Input() active = false;

  /** Whether the chip is disabled. */
  @Input() disabled = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'filter-chip';

  /** Event emitted when the chip is clicked. Emits the updated active state. */
  @Output() chipClick = new EventEmitter<boolean>();

  /** Handles chip click. */
  onClick(): void {
    if (!this.disabled) {
      this.active = !this.active;
      this.chipClick.emit(this.active);
    }
  }
}
