import { Component, Input, ChangeDetectionStrategy, Optional } from '@angular/core';
import { IonBadge } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Supported order status codes for status badge display.
 */
export type CommandeStatus = 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE' | 'REGLEE' | 'ANNULEE' | 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED' | 'PRIORITAIRE';

/**
 * Status Badge component conforming to Figma Design System StatusBadge (ID 58:20).
 *
 * Displays an order or entity status badge with color coding according to the Figma DS palette.
 * When marked as prioritary, renders both the status badge and the prominent urgency pill.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [IonBadge],
  templateUrl: './status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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

  constructor(@Optional() private readonly translocoService?: TranslocoService) {}

  /** Backward-compatible badgeColor getter used by legacy consumers and tests. */
  get badgeColor(): string {
    if (this.customColor) return '';
    if (this.prioritary || this.status === 'PRIORITAIRE') {
      return 'tertiary';
    }
    return this.statusBadgeColor;
  }

  /** Backward-compatible label getter used by legacy consumers and tests. */
  get label(): string {
    if (this.customLabel) return this.customLabel;
    if (this.prioritary || this.status === 'PRIORITAIRE') {
      return '⚡ Prioritaire';
    }
    return this.statusLabel;
  }

  /** Label for the priority badge. */
  get priorityLabel(): string {
    if (this.translocoService) {
      const translated = this.translocoService.translate('COMMANDES.PRIORITE');
      if (translated && translated !== 'COMMANDES.PRIORITE') {
        return translated;
      }
    }
    return 'Priorité';
  }

  /** Gets the Ionic color name for the status itself. */
  get statusBadgeColor(): string {
    if (this.customColor) return '';
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
      case 'PRIORITAIRE':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  /** Gets the localized display label for the status itself. */
  get statusLabel(): string {
    if (this.customLabel) return this.customLabel;
    if (this.translocoService) {
      const translocoKey = 'COMMANDES.STATUTS.' + this.status;
      const translated = this.translocoService.translate(translocoKey);
      if (translated && translated !== translocoKey) {
        return translated;
      }
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
      case 'PRIORITAIRE':
        return '⚡ Prioritaire';
      default:
        return String(this.status);
    }
  }
}
