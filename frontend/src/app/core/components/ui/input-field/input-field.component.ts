import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

/**
 * Input Field component conforming to Figma Design System InputField (ID 535:942).
 *
 * Implements ControlValueAccessor for integration with Angular forms.
 */
@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [IonIcon, ReactiveFormsModule],
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    }
  ]
})
export class InputFieldComponent extends BaseControlValueAccessor {
  /** Counter used to generate unique IDs across all instances of this component. */
  private static nextId = 0;

  /** Unique ID linking the label to its input for accessibility. */
  readonly inputId: string;

  constructor() {
    super();
    InputFieldComponent.nextId += 1;
    this.inputId = `app-input-field-${InputFieldComponent.nextId}`;
  }

  /** Label text for the input field. */
  @Input() label?: string;

  /** Placeholder text. */
  @Input() placeholder = '';

  /** HTML input type ('text', 'password', 'number', 'email', etc.). */
  @Input() type = 'text';

  /** Optional leading icon name. */
  @Input() icon?: string;

  /** Helper text displayed below the field. */
  @Input() helperText?: string;

  /** Error message displayed when validation fails. */
  @Input() errorMessage?: string;

  /** Whether the field is required. */
  @Input() required = false;

  /** Autocomplete behavior attribute. */
  @Input() autocomplete = 'off';

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'input-field';

  /** Input change handler. */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}
