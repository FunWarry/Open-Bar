import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';
import { OngoingOrder } from '../../models/ongoing-order.model';

/**
 * Compact order card representation for Manager Kanban columns.
 */
@Component({
  selector: 'app-mini-commande-card',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent],
  templateUrl: './mini-commande-card.component.html',
  styleUrls: ['./mini-commande-card.component.scss'],
})
export class MiniCommandeCardComponent {
  /** The ongoing order view displayed by the mini card. */
  @Input() order!: OngoingOrder;

  /** Formatted time string (HH:mm) of order creation. */
  get formattedTime(): string {
    if (!this.order?.dateCommande) return '';
    const date = new Date(this.order.dateCommande);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
