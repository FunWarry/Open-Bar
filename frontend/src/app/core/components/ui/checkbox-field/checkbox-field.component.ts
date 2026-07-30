import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Atomic Checkbox control component conforming to Figma Design System CheckBox (ID 426:2058).
 *
 * Implements ControlValueAccessor for integration with Angular forms.
 */
@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkbox-field.component.html',
  styleUrls: ['./checkbox-field.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxFieldComponent),
      multi: true,
    },
  ],
})
export class CheckboxFieldComponent implements ControlValueAccessor {
  /** Text label displayed alongside the checkbox. */
  @Input() label?: string;

  /** Whether the checkbox is currently checked. */
  @Input() checked = false;

  /** Whether the control is disabled. */
  @Input() disabled = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'checkbox-field';

  /** Event emitted when checked state changes manually. */
  @Output() checkedChange = new EventEmitter<boolean>();

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  /** Toggles the checked state when triggered. */
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
