import { Directive, Input } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

@Directive()
export abstract class BaseControlValueAccessor implements ControlValueAccessor {
  @Input() disabled = false;
  value = '';

  protected onChange: (val: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(val: string): void {
    this.value = val || '';
  }

  registerOnChange(fn: (val: string) => void): void {
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
