import { Component, Input } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';

export type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IonCard, IonCardContent, IonIcon, NgIf, NgClass],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.css']
})
export class StatCardComponent {
  @Input() title?: string;
  @Input() label?: string;
  @Input() value!: string | number;
  @Input() icon?: string;
  @Input() trend?: string;
  @Input() trendDirection: TrendDirection = 'neutral';
  @Input() color?: string;

  get displayTitle(): string {
    return this.title || this.label || '';
  }
}

