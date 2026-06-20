import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
})
export class StatCardComponent {
  @Input() label!: string;
  @Input() value!: string | number;
  @Input() trend: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' = 'primary';

  get trendSymbol(): string {
    if (this.trend === 'up') return '▲';
    if (this.trend === 'down') return '▼';
    return '■';
  }
}
