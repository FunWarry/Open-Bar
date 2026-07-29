import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'edit' | 'mark';
export type ButtonSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [IonIcon, IonSpinner, NgClass],
  templateUrl: './action-button.component.html',
  styleUrls: ['./action-button.component.css']
})
export class ActionButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'medium';
  @Input() icon?: string;
  @Input() iconSlot: 'start' | 'end' | 'icon-only' = 'start';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() expand?: 'block' | 'full';

  @Output() btnClick = new EventEmitter<Event>();

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit(event);
    }
  }

  get colorAttr(): string | undefined {
    if (this.variant === 'danger') return 'danger';
    if (this.variant === 'primary') return 'primary';
    return undefined;
  }

  get fillAttr(): 'solid' | 'outline' | 'clear' {
    if (this.variant === 'ghost') return 'clear';
    if (this.variant === 'secondary' || this.variant === 'edit') return 'outline';
    return 'solid';
  }
}
