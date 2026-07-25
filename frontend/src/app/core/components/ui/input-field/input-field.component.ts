import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { IonItem, IonLabel, IonInput, IonNote, IonIcon } from '@ionic/angular/standalone';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [IonItem, IonLabel, IonInput, IonNote, IonIcon, NgIf, ReactiveFormsModule],
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
