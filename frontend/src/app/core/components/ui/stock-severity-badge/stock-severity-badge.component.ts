import { Component, Input } from '@angular/core';
import { IonBadge } from '@ionic/angular/standalone';

export type StockSeverity = 'CRITIQUE' | 'FAIBLE' | 'NORMAL' | 'critique' | 'faible' | 'normal';

/**
 * Stock Severity Badge component conforming to Figma Design System StockRow (ID 133:133).
 *
 * Displays stock level severity badge ('CRITIQUE', 'FAIBLE', 'NORMAL') with color indicator.
 */
@Component({
  selector: 'app-stock-severity-badge',
  standalone: true,
  imports: [IonBadge],
  templateUrl: './stock-severity-badge.component.html',
  styleUrls: ['./stock-severity-badge.component.css']
})
export class StockSeverityBadgeComponent {
  /** Ingredient/stock severity level. */
  @Input() severity: StockSeverity = 'NORMAL';

  /** Custom data-testid attribute for E2E testing. */
  @Input() testId = 'stock-severity-badge';

  /** Gets Ionic color name for the severity level. */
  get badgeColor(): string {
    const s = this.severity.toUpperCase();
    if (s === 'CRITIQUE') return 'danger';
    if (s === 'FAIBLE') return 'warning';
    return 'success';
  }

  /** Gets display label for the severity level. */
  get label(): string {
    const s = this.severity.toUpperCase();
    if (s === 'CRITIQUE') return 'Stock Critique';
    if (s === 'FAIBLE') return 'Stock Faible';
    return 'Stock Normal';
  }
}
