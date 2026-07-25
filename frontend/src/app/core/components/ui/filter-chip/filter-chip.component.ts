import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { IonChip, IonIcon, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-filter-chip',
  standalone: true,
  imports: [IonChip, IonIcon, IonLabel, NgIf],
  templateUrl: './filter-chip.component.html',
  styleUrls: ['./filter-chip.component.css']
})
export class FilterChipComponent {
  @Input() label!: string;
  @Input() icon?: string;
  @Input() active = false;
  @Input() disabled = false;

  @Output() chipClick = new EventEmitter<boolean>();

  onClick(): void {
    if (!this.disabled) {
      this.active = !this.active;
      this.chipClick.emit(this.active);
    }
  }
}
