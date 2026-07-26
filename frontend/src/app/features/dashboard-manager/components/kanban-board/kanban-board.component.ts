import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonBadge } from '@ionic/angular/standalone';
import { KanbanColumn, OngoingOrder } from '../../models/ongoing-order.model';
import { MiniCommandeCardComponent } from '../mini-commande-card/mini-commande-card.component';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, IonBadge, MiniCommandeCardComponent],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss'],
})
export class KanbanBoardComponent {
  @Input() orders: OngoingOrder[] = [];

  get columns(): KanbanColumn[] {
    return [
      { statut: 'EN_ATTENTE',     label: 'Pending',        color: 'warning',   orders: this.filterByStatut('EN_ATTENTE') },
      { statut: 'EN_PREPARATION', label: 'In Progress',    color: 'primary',   orders: this.filterByStatut('EN_PREPARATION') },
      { statut: 'PRET',           label: 'Ready to Serve', color: 'success',   orders: this.filterByStatut('PRET') },
      { statut: 'LIVREE',         label: 'Served',         color: 'medium',    orders: this.filterByStatut('LIVREE') },
    ];
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
