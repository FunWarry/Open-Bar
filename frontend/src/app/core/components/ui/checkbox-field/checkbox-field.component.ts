import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BaseToggleControl } from '../base-control-value-accessor';

/**
 * Atomic Checkbox control component conforming to Figma Design System CheckBox (ID 426:2058).
 *
 * Extends BaseToggleControl for integration with Angular forms.
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
export class CheckboxFieldComponent extends BaseToggleControl {
  private static nextId = 0;
  readonly inputId: string;

  constructor() {
    super();
    CheckboxFieldComponent.nextId += 1;
    this.inputId = `app-checkbox-${CheckboxFieldComponent.nextId}`;
  }

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'checkbox-field';
}
