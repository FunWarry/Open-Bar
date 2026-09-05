import { Component, Input } from '@angular/core';
import { IonBadge } from '@ionic/angular/standalone';

export type CommandeStatus = 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE' | 'REGLEE' | 'ANNULEE' | 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED' | 'PRIORITAIRE';

/**
 * Status Badge component conforming to Figma Design System StatusBadge (ID 58:20).
 *
 * Displays an order or entity status badge with color coding according to the Figma DS palette.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [IonBadge],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css']
})
export class StatusBadgeComponent {
  /** Order or item status. */
  @Input() status: CommandeStatus = 'EN_ATTENTE';

  /** Whether the item is marked as prioritary. */
  @Input() prioritary?: boolean = false;

  /** Optional custom text label override. */
  @Input() customLabel?: string;

  /** Optional custom Ionic color name override. */
  @Input() customColor?: string;

  /** Custom data-testid attribute for End-to-End testing. */
  @Input() testId = 'status-badge';

  /** Gets the Ionic color name for the current status. */
  get badgeColor(): string {
    if (this.customColor) return '';
    if (this.prioritary || this.status === 'PRIORITAIRE') {
      return 'tertiary';
    }
    switch (this.status) {
      case 'EN_ATTENTE':
      case 'PENDING':
        return 'warning';
      case 'EN_PREPARATION':
      case 'IN_PROGRESS':
        return 'primary';
      case 'PRET':
      case 'READY':
        return 'secondary';
      case 'LIVREE':
      case 'SERVED':
      case 'REGLEE':
        return 'success';
      case 'ANNULEE':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /** Gets the localized display label for the current status. */
  get label(): string {
    if (this.customLabel) return this.customLabel;
    if (this.prioritary || this.status === 'PRIORITAIRE') {
      return '⚡ Prioritaire';
    }
    switch (this.status) {
      case 'EN_ATTENTE':
      case 'PENDING':
        return 'En attente';
      case 'EN_PREPARATION':
      case 'IN_PROGRESS':
        return 'En préparation';
      case 'PRET':
      case 'READY':
        return 'Prêt';
      case 'LIVREE':
      case 'SERVED':
        return 'Livrée';
      case 'REGLEE':
        return 'Réglée';
      case 'ANNULEE':
      case 'CANCELLED':
        return 'Annulée';
      default:
        return String(this.status);
    }
  }
}
