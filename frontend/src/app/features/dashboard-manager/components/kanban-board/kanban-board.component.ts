import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonBadge } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { KanbanColumn, OngoingOrder } from '../../models/ongoing-order.model';
import { MiniCommandeCardComponent } from '../mini-commande-card/mini-commande-card.component';

/**
 * Kanban Board Component for Manager Operations.
 * Displays a multi-column workflow board monitoring active orders in real time.
 */
@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, IonBadge, TranslocoPipe, MiniCommandeCardComponent],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss'],
})
export class KanbanBoardComponent {
  /** List of ongoing in-flight orders to categorize into columns. */
  @Input() orders: OngoingOrder[] = [];

  /** Whether delivered/closed orders column is visible. */
  @Input() showDelivered = false;

  /**
   * Resolved Kanban columns mapped to corresponding order statuses.
   */
  get columns(): KanbanColumn[] {
    const cols: KanbanColumn[] = [
      { statut: 'EN_ATTENTE',     label: 'MANAGER_DASHBOARD.STATUS_PENDING',     color: 'warning',   orders: this.filterByStatut('EN_ATTENTE') },
      { statut: 'EN_PREPARATION', label: 'MANAGER_DASHBOARD.STATUS_IN_PROGRESS', color: 'primary',   orders: this.filterByStatut('EN_PREPARATION') },
      { statut: 'PRET',           label: 'MANAGER_DASHBOARD.STATUS_READY',       color: 'success',   orders: this.filterByStatut('PRET') },
    ];
    if (this.showDelivered) {
      cols.push({
        statut: 'LIVREE',
        label: 'MANAGER_DASHBOARD.STATUS_DELIVERED',
        color: 'medium',
        orders: this.filterByStatut('LIVREE')
      });
    }
    return cols;
  }

  private filterByStatut(statut: string): OngoingOrder[] {
    return this.orders.filter(o => o.statut === statut);
  }

  trackByOrderId(_: number, order: OngoingOrder): number {
    return order.id;
  }

  trackByStatut(_: number, col: KanbanColumn): string {
    return col.statut;
  }
}
