import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Atomic Toggle Switch component conforming to Figma Design System Toggle (ID 534:910).
 *
 * Implements ControlValueAccessor for seamless integration with Angular Reactive & Template-driven forms.
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
export class ToggleSwitchComponent implements ControlValueAccessor {
  /** Optional text label displayed next to the toggle switch. */
  @Input() label?: string;

  /** Whether the switch is currently checked (On). */
  @Input() checked = false;

  /** Whether the control is disabled. */
  @Input() disabled = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'toggle-switch';

  /** Event emitted when the checked state changes manually. */
  @Output() checkedChange = new EventEmitter<boolean>();

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  /** Toggles the checked state when clicked or triggered via keyboard. */
  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.checkedChange.emit(this.checked);
  }

  // --- ControlValueAccessor Implementation ---

  writeValue(value: boolean): void {
    this.checked = Boolean(value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
