import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [IonButton, IonIcon],
  templateUrl: './quantity-stepper.component.html',
  styleUrls: ['./quantity-stepper.component.css']
})
export class QuantityStepperComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() max = 99;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<number>();

  decrement(): void {
    if (!this.disabled && this.value > this.min) {
      this.value--;
      this.valueChange.emit(this.value);
    }
  }

  increment(): void {
    if (!this.disabled && this.value < this.max) {
      this.value++;
      this.valueChange.emit(this.value);
    }
  }
}
