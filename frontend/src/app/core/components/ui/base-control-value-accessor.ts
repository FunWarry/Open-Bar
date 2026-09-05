import { Directive, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

/**
 * Generic Base ControlValueAccessor abstract class for custom form control components.
 */
@Directive()
export abstract class BaseControlValueAccessor<T = any> implements ControlValueAccessor {
  @Input() disabled = false;
  value!: T;

  protected onChange: (val: T) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(val: T): void {
    this.value = val;
  }

  registerOnChange(fn: (val: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onBlur(): void {
    this.onTouched();
  }
}

/**
 * Abstract base class for toggleable boolean form controls (e.g. ToggleSwitch, CheckboxField).
 */
@Directive()
export abstract class BaseToggleControl extends BaseControlValueAccessor<boolean> {
  /** Optional text label displayed next to the toggle element. */
  @Input() label?: string;

  /** Initial value / checked state. */
  @Input() override value = false;

  /** Event emitted when checked state changes manually. */
  @Output() checkedChange = new EventEmitter<boolean>();

  get checked(): boolean {
    return Boolean(this.value);
  }
  set checked(val: boolean) {
    this.value = val;
  }

  /** Toggles the boolean state when triggered. */
  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.checkedChange.emit(this.checked);
  }
}
