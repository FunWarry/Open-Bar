import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonCard, IonIcon, IonButton, IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eye, banOutline, playOutline, checkmarkCircleOutline,
  checkmarkDoneOutline, timeOutline, alertCircleOutline,
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';

/**
 * Encapsulates an order card displayed inside Kanban columns or list items.
 * Extracts card rendering logic to avoid HTML template duplication across columns.
 */
@Component({
  selector: 'app-commande-card',
  templateUrl: './commande-card.component.html',
  styleUrls: ['./commande-card.component.css'],
  standalone: true,
  imports: [
    IonCard, IonIcon, IonButton, IonBadge,
    CurrencyPipe, DatePipe, TranslocoPipe,
  ],
})
export class CommandeCardComponent {
  @Input({ required: true }) commande!: Commande;
  @Input() showActions = true;

  @Output() updateStatus = new EventEmitter<{ commande: Commande; targetStatut: CommandeStatut }>();
  @Output() annuler = new EventEmitter<Commande>();
  @Output() view = new EventEmitter<Commande>();

  constructor() {
    addIcons({
      eye, banOutline, playOutline, checkmarkCircleOutline,
      checkmarkDoneOutline, timeOutline, alertCircleOutline,
    });
  }

  getDelayMinutes(dateCommande: string | Date | undefined): number {
    if (!dateCommande) return 0;
    const start = new Date(dateCommande).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 60000));
  }

  isPriority(): boolean {
    if (!this.commande) return false;
    const delay = this.getDelayMinutes(this.commande.dateCommande);
    const hasPriorityNote = this.commande.notes != null && (
      this.commande.notes.toLowerCase().includes('urg') ||
      this.commande.notes.toLowerCase().includes('retard') ||
      this.commande.notes.toLowerCase().includes('vip')
    );
    return (this.commande.statut === 'EN_ATTENTE' && delay > 10) || hasPriorityNote;
  }

  peutAnnuler(): boolean {
    if (!this.commande) return false;
    return !['LIVREE', 'REGLEE', 'ANNULEE'].includes(this.commande.statut);
  }

  getStatutLabelKey(): string {
    return `COMMANDES.STATUTS.${this.commande?.statut || 'EN_ATTENTE'}`;
  }

  onView(): void {
    this.view.emit(this.commande);
  }

  onAnnuler(): void {
    this.annuler.emit(this.commande);
  }

  onUpdateStatus(targetStatut: CommandeStatut): void {
    this.updateStatus.emit({ commande: this.commande, targetStatut });
  }
}
