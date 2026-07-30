import { Directive, Input } from '@angular/core';
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
