import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonIcon, IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eye, banOutline, playOutline, checkmarkCircleOutline,
  checkmarkDoneOutline, timeOutline, alertCircleOutline,
} from 'ionicons/icons';
import { TranslocoPipe } from '@jsverse/transloco';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';

export interface GroupedCommandeItem {
  id: number;
  cocktailId: number;
  cocktailNom: string;
  varianteId?: number;
  varianteNom?: string;
  quantite: number;
  prixUnitaire: number;
  notes?: string;
}

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
    IonIcon, IonButton,
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

  /**
   * Groups identical items (same cocktail name, variante, and notes) and sums quantities.
   */
  get groupedItems(): GroupedCommandeItem[] {
    if (!this.commande?.items) return [];
    const map = new Map<string, GroupedCommandeItem>();
    for (const item of this.commande.items) {
      const nomKey = (item.cocktailNom || item.cocktailId || '').toString().trim().toLowerCase();
      const varianteKey = item.varianteNom ? item.varianteNom.trim().toLowerCase() : (item.varianteId || 0);
      const notesKey = (item.notes || '').trim().toLowerCase();
      const key = `${nomKey}_${varianteKey}_${notesKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantite += (item.quantite || 1);
      } else {
        map.set(key, { ...item, quantite: item.quantite || 1 });
      }
    }
    return Array.from(map.values());
  }

  getItemLineTotal(item: GroupedCommandeItem): number {
    return (item.prixUnitaire || 0) * (item.quantite || 1);
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
