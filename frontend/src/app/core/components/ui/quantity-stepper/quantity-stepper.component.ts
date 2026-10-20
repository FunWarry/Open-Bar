import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, remove } from 'ionicons/icons';

/**
 * Interactive quantity stepper component with increment, decrement and direct numerical entry controls.
 */
@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './quantity-stepper.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./quantity-stepper.component.css']
})
export class QuantityStepperComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() max = 99;
  @Input() step = 1;
  @Input() disabled = false;
  @Input() testId = 'quantity-stepper';

  @Output() valueChange = new EventEmitter<number>();

  constructor() {
    addIcons({ add, remove });
  }

  /**
   * Decrements the quantity by step size down to minimum bound.
   */
  decrement(): void {
    if (!this.disabled && this.value > this.min) {
      this.value = Math.max(this.min, Math.round((this.value - this.step) * 100) / 100);
      this.valueChange.emit(this.value);
    }
  }

  /**
   * Increments the quantity by step size up to maximum bound.
   */
  increment(): void {
    if (!this.disabled && this.value < this.max) {
      this.value = Math.min(this.max, Math.round((this.value + this.step) * 100) / 100);
      this.valueChange.emit(this.value);
    }
  }

  /**
   * Handles direct numerical typing in the input field.
   *
   * @param event Input event
   */
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const parsed = parseFloat(input.value);
    if (!isNaN(parsed)) {
      this.value = parsed;
      this.valueChange.emit(this.value);
    }
  }

  /**
   * Sanitizes and bounds-checks the typed value upon losing focus.
   *
   * @param event Blur event
   */
  onBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    let parsed = parseFloat(input.value);
    if (isNaN(parsed) || parsed < this.min) {
      parsed = this.min;
    } else if (parsed > this.max) {
      parsed = this.max;
    }
    this.value = Math.round(parsed * 100) / 100;
    input.value = this.value.toString();
    this.valueChange.emit(this.value);
  }

  /**
   * Automatically selects entire text on focus for effortless one-tap replacement.
   *
   * @param event Focus event
   */
  onFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }
}

