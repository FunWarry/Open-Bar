import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [IonIcon],
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
export class PasswordInputComponent extends BaseControlValueAccessor {
  @Input() label = 'Mot de passe';
  @Input() placeholder = '';
  @Input() errorMessage?: string;
  @Input() helperText?: string;
  @Input() required = false;
  @Input() autocomplete = 'current-password';
  @Input() inputId = 'password-input-field';
  @Input() testId?: string;

  showPassword = false;

  toggleVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}
