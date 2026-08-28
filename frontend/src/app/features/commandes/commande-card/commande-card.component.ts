import { Component, Input, Output, EventEmitter, Optional } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonIcon, IonButton, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eye, banOutline, playOutline, checkmarkCircleOutline,
  checkmarkDoneOutline, timeOutline, alertCircleOutline,
} from 'ionicons/icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Commande, CommandeStatut } from '../../../core/models/commande.model';
import { CancelOrderModalComponent } from '../../../core/components/ui/cancel-order-modal/cancel-order-modal.component';
import { groupCommandeItems } from '../../../core/utils/order-item-grouper';

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
 * Clicking on the card emits a view event to display order details in a modal.
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

  constructor(
    @Optional() private readonly modalCtrl?: ModalController,
    @Optional() private readonly translocoService?: TranslocoService,
  ) {
    addIcons({
      eye, banOutline, playOutline, checkmarkCircleOutline,
      checkmarkDoneOutline, timeOutline, alertCircleOutline,
    });
  }

  /**
   * Groups identical items (same cocktail name, variante, and notes) and sums quantities.
   */
  get groupedItems(): GroupedCommandeItem[] {
    return groupCommandeItems(this.commande?.items) as GroupedCommandeItem[];
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

  async onAnnuler(event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    if (!this.modalCtrl) {
      this.annuler.emit(this.commande);
      return;
    }

    const modal = await this.modalCtrl.create({
      component: CancelOrderModalComponent,
      componentProps: {
        commande: this.commande,
      },
      cssClass: 'cancel-order-modal-dialog',
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' || data?.confirmed) {
      this.annuler.emit(this.commande);
    }
  }

  onUpdateStatus(targetStatut: CommandeStatut, event?: Event): void {
    if (event) event.stopPropagation();
    this.updateStatus.emit({ commande: this.commande, targetStatut });
  }
}
