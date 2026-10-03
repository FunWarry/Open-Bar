import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { NgClass } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  cashOutline,
  receiptOutline,
  restaurantOutline,
  checkmarkCircleOutline,
  checkmarkDoneCircleOutline,
  closeCircleOutline,
  wineOutline,
  statsChartOutline,
  timeOutline,
  peopleOutline,
  people,
  shieldCheckmarkOutline,
  trashOutline,
  personOutline,
  calculatorOutline,
  cubeOutline,
  cardOutline,
  alertCircleOutline,
  calendarOutline,
  documentTextOutline,
  pieChartOutline
} from 'ionicons/icons';

/**
 * Direction indicator for metric trends (up, down, neutral).
 */
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Layout orientation preset for stat card presentation.
 */
export type StatCardLayout = 'vertical' | 'horizontal';

/**
 * Size variants for stat cards.
 */
export type StatCardSize = 'sm' | 'md' | 'lg';

/**
 * Supported semantic color accent tokens.
 * Uses `(string & { _?: never })` to preserve auto-complete while allowing arbitrary strings.
 */
export type StatCardColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'secondary'
  | 'tertiary'
  | 'pink'
  | 'cyan'
  | 'neutral'
  | (string & { _?: never });

/**
 * Position of the title/label in relation to value in horizontal layout.
 */
export type StatCardLabelPosition = 'top' | 'bottom';

/**
 * Composite Stat Card component conforming to Figma Design System StatCard (ID 199:189).
 *
 * Displays a metric / KPI data card with dual layouts (vertical and horizontal),
 * flexible slot projections (`[stat-icon]`, `[stat-title]`, `[stat-value]`, `[stat-footer]`),
 * semantic color presets, custom subtext, trends, and click interactivity.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IonIcon, NgClass],
  templateUrl: './stat-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./stat-card.component.css']
})
export class StatCardComponent {
  /** Layout orientation preset ('vertical' or 'horizontal'). Defaults to 'vertical'. */
  @Input() layout: StatCardLayout = 'vertical';

  /** Size preset ('sm', 'md', 'lg'). Defaults to 'md'. */
  @Input() size: StatCardSize = 'md';

  /** Metric card title header. */
  @Input() title?: string | null;

  /** Alias for title. */
  @Input() label?: string | null;

  /** Metric value content text or number. */
  @Input() value?: string | number | null;

  /** Additional CSS class applied to the value text element. */
  @Input() valueClass?: string | null;

  /** Secondary subtitle or helper text displayed under title or value. */
  @Input() subtext?: string | null;

  /** Additional CSS class applied to the subtext element. */
  @Input() subtextClass?: string | null;

  /** Ionicon icon identifier (e.g. 'cash-outline', 'restaurant-outline'). */
  @Input() icon?: string | null;

  /** Explicit position of label relative to value ('top' or 'bottom'). */
  @Input() labelPosition?: StatCardLabelPosition | null;

  /** Optional trend percentage or text string (e.g. '+12%', 'Critique'). */
  @Input() trend?: string | null;

  /** Trend direction indicator ('up', 'down', 'neutral'). */
  @Input() trendDirection: TrendDirection = 'neutral';

  /** Color variant identifier. */
  @Input() color?: StatCardColor | null;

  /** Whether the card has an active glow/accent border highlight. */
  @Input() highlight = false;

  /** Whether the card is clickable and interactive. */
  @Input() clickable = false;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'stat-card';

  /** Event emitted when the card is clicked or activated via Enter/Space key. */
  @Output() cardClick = new EventEmitter<MouseEvent | KeyboardEvent>();

  constructor() {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      cashOutline,
      receiptOutline,
      restaurantOutline,
      checkmarkCircleOutline,
      checkmarkDoneCircleOutline,
      closeCircleOutline,
      wineOutline,
      statsChartOutline,
      timeOutline,
      peopleOutline,
      people,
      shieldCheckmarkOutline,
      trashOutline,
      personOutline,
      calculatorOutline,
      cubeOutline,
      cardOutline,
      alertCircleOutline,
      calendarOutline,
      documentTextOutline,
      pieChartOutline
    });
  }

  /** Resolved title display string from title or label input. */
  get displayTitle(): string {
    return this.title || this.label || '';
  }

  /** Symbolic representation of trend direction for legacy support. */
  get trendSymbol(): string {
    if (this.trendDirection === 'up' || this.trend === 'up') return '▲';
    if (this.trendDirection === 'down' || this.trend === 'down') return '▼';
    return '■';
  }

  /** Whether label is rendered above value in the DOM layout. */
  get isLabelTop(): boolean {
    if (this.labelPosition) {
      return this.labelPosition === 'top';
    }
    return this.layout === 'vertical';
  }

  /** Handles click events on the root card element. */
  onClick(event: MouseEvent): void {
    if (this.clickable || this.cardClick.observed) {
      this.cardClick.emit(event);
    }
  }

  /** Handles keyboard activation (Enter / Space) for accessibility when interactive. */
  onKeyDown(event: KeyboardEvent): void {
    if ((this.clickable || this.cardClick.observed) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.cardClick.emit(event);
    }
  }
}
