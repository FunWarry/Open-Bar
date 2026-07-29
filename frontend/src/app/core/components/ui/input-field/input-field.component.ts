import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { IonIcon } from '@ionic/angular/standalone';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

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
  readonly inputId = `app-input-field-${++InputFieldComponent.nextId}`;
  @Input() label?: string;
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() icon?: string;
  @Input() helperText?: string;
  @Input() errorMessage?: string;
  @Input() required = false;
  @Input() autocomplete = 'off';

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}
