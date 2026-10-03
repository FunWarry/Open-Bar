import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

/**
 * Theme-adaptive password input component with visibility toggle.
 */
@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './password-input.component.html',
  styleUrls: ['./password-input.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
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
