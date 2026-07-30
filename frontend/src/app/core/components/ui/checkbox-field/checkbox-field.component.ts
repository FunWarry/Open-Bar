import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BaseControlValueAccessor } from '../base-control-value-accessor';

/**
 * Atomic Checkbox control component conforming to Figma Design System CheckBox (ID 426:2058).
 *
 * Extends BaseControlValueAccessor for integration with Angular forms.
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
export class CheckboxFieldComponent extends BaseControlValueAccessor<boolean> {
  private static nextId = 0;
  readonly inputId: string;

  constructor() {
    super();
    CheckboxFieldComponent.nextId += 1;
    this.inputId = `app-checkbox-${CheckboxFieldComponent.nextId}`;
  }

  /** Text label displayed alongside the checkbox. */
  @Input() label?: string;

  /** Initial value / checked state. */
  @Input() override value = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'checkbox-field';

  /** Event emitted when checked state changes manually. */
  @Output() checkedChange = new EventEmitter<boolean>();

  get checked(): boolean {
    return Boolean(this.value);
  }
  set checked(val: boolean) {
    this.value = val;
  }

  /** Toggles the checked state when triggered. */
  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.checkedChange.emit(this.checked);
  }
}
