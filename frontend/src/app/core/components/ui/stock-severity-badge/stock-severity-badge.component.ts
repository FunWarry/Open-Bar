import { Component, Input } from '@angular/core';
import { IonBadge } from '@ionic/angular/standalone';

export type StockSeverity = 'CRITIQUE' | 'FAIBLE' | 'NORMAL' | 'critique' | 'faible' | 'normal';

@Component({
  selector: 'app-stock-severity-badge',
  standalone: true,
  imports: [IonBadge],
  templateUrl: './stock-severity-badge.component.html',
  styleUrls: ['./stock-severity-badge.component.css']
})
export class StockSeverityBadgeComponent {
  @Input() severity: StockSeverity = 'NORMAL';

  get badgeColor(): string {
    const s = this.severity.toUpperCase();
    if (s === 'CRITIQUE') return 'danger';
    if (s === 'FAIBLE') return 'warning';
    return 'success';
  }

  get label(): string {
    const s = this.severity.toUpperCase();
    if (s === 'CRITIQUE') return 'Stock Critique';
    if (s === 'FAIBLE') return 'Stock Faible';
    return 'Stock Normal';
  }
}
