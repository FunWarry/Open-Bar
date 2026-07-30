import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

/**
 * Atomic Toggle Switch component conforming to Figma Design System Toggle (ID 534:910).
 *
 * Extends BaseControlValueAccessor for seamless integration with Angular Reactive & Template-driven forms.
 */
@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toggle-switch.component.html',
  styleUrls: ['./toggle-switch.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true,
    },
  ],
})
export class ToggleSwitchComponent extends BaseControlValueAccessor<boolean> {
  /** Optional text label displayed next to the toggle switch. */
  @Input() label?: string;

  /** Initial value / checked state. */
  @Input() override value = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'toggle-switch';

  /** Event emitted when the checked state changes manually. */
  @Output() checkedChange = new EventEmitter<boolean>();

  get checked(): boolean {
    return Boolean(this.value);
  }
  set checked(val: boolean) {
    this.value = val;
  }

  /** Toggles the checked state when clicked or triggered via keyboard. */
  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.checkedChange.emit(this.checked);
  }
}
