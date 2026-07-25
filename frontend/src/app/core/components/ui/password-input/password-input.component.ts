import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIf } from '@angular/common';
import { IonItem, IonLabel, IonInput, IonNote, IonIcon, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [IonItem, IonLabel, IonInput, IonNote, IonIcon, IonButton, NgIf],
  templateUrl: './password-input.component.html',
  styleUrls: ['./password-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInputComponent),
      multi: true
    }
  ]
})
export class PasswordInputComponent implements ControlValueAccessor {
  @Input() label = 'Mot de passe';
  @Input() placeholder = '';
  @Input() errorMessage?: string;
  @Input() helperText?: string;
  @Input() disabled = false;
  @Input() required = false;
  @Input() autocomplete = 'current-password';

  value = '';
  showPassword = false;

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

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

  toggleVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
