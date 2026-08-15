import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { timeOutline, personOutline, documentTextOutline } from 'ionicons/icons';
import { OngoingOrder } from '../../models/ongoing-order.model';

/**
 * Compact order card representation for Manager Kanban columns.
 * Displays order context, items breakdown, server, total amount, and elapsed time.
 */
@Component({
  selector: 'app-mini-commande-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon],
  templateUrl: './mini-commande-card.component.html',
  styleUrls: ['./mini-commande-card.component.scss'],
})
export class MiniCommandeCardComponent {
  /** The ongoing order view displayed by the mini card. */
  @Input() order!: OngoingOrder;

  constructor() {
    addIcons({ timeOutline, personOutline, documentTextOutline });
  }

  /** Formatted time string (HH:mm) of order creation. */
  get formattedTime(): string {
    if (!this.order?.dateCommande) return '';
    const date = new Date(this.order.dateCommande);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** Formats currency amount in EUR. */
  formatCurrency(val?: number): string {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
  }
}
