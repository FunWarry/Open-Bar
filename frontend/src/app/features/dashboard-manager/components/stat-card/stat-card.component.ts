import { Component, Input } from '@angular/core';

import { IonCard, IonCardContent } from '@ionic/angular/standalone';

/**
 * Metric display card presenting KPI statistics and trends.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IonCard, IonCardContent],
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
