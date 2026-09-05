import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  cashOutline,
  receiptOutline,
  restaurantOutline,
  checkmarkCircleOutline,
  wineOutline,
  statsChartOutline,
  timeOutline,
  peopleOutline
} from 'ionicons/icons';

export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Composite Stat Card component conforming to Figma Design System StatCard (ID 199:189).
 *
 * Displays a KPI metric card with title, numeric value, icon indicator, and trend direction indicator.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IonIcon, NgClass],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.css']
})
export class StatCardComponent {
  /** Metric card title header. */
  @Input() title?: string;

  /** Alias for title. */
  @Input() label?: string;

  /** Metric value content text or number. */
  @Input() value!: string | number;

  /** Ionicon icon identifier. */
  @Input() icon?: string;

  /** Optional trend percentage string (e.g. '+12%'). */
  @Input() trend?: string;

  /** Trend direction indicator ('up', 'down', 'neutral'). */
  @Input() trendDirection: TrendDirection = 'neutral';

  /** Color variant identifier. */
  @Input() color?: string;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'stat-card';

  constructor() {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      cashOutline,
      receiptOutline,
      restaurantOutline,
      checkmarkCircleOutline,
      wineOutline,
      statsChartOutline,
      timeOutline,
      peopleOutline
    });
  }

  /** Resolved title display string. */
  get displayTitle(): string {
    return this.title || this.label || '';
  }
}
