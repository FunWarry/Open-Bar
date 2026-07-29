import { Component, Input } from '@angular/core';
import { IonBadge } from '@ionic/angular/standalone';

export type CommandeStatus = 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'LIVREE' | 'REGLEE' | 'ANNULEE' | 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED' | 'PRIORITAIRE';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [IonBadge],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css']
})
export class StatusBadgeComponent {
  @Input() status: CommandeStatus = 'EN_ATTENTE';
  @Input() prioritary?: boolean = false;
  @Input() customLabel?: string;
  @Input() customColor?: string;

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

