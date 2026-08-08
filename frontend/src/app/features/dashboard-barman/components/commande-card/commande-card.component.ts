import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline, checkmarkCircleOutline, arrowForwardCircleOutline, flashOutline
} from 'ionicons/icons';
import { CommandeView, CommandeItemView } from '../../models/commande-view.model';
import { groupCommandeItems } from '../../../../core/utils/order-item-grouper';
import { interval, Subscription } from 'rxjs';

import { StatusBadgeComponent } from '../../../../core/components/ui/status-badge/status-badge.component';
import { ActionButtonComponent } from '../../../../core/components/ui/action-button/action-button.component';

@Component({
  selector: 'app-commande-card',
  standalone: true,
  imports: [
    CommonModule,
    IonIcon,
    StatusBadgeComponent,
    ActionButtonComponent,
  ],
  templateUrl: './commande-card.component.html',
  styleUrls: ['./commande-card.component.scss'],
})
export class CommandeCardComponent implements OnInit, OnDestroy {
  @Input() commande!: CommandeView;
  @Output() changerStatut = new EventEmitter<{ id: number; statut: string }>();

  tempsEcoule = '0 min';
  private timerSub?: Subscription;

  get groupedItems(): CommandeItemView[] {
    return groupCommandeItems(this.commande?.items) as CommandeItemView[];
  }

  constructor() {
    addIcons({ timeOutline, checkmarkCircleOutline, arrowForwardCircleOutline, flashOutline });
  }

  ngOnInit() {
    this.updateTimer();
    // Mise à jour toutes les 30 secondes
    this.timerSub = interval(30000).subscribe(() => this.updateTimer());
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  private updateTimer() {
    const diff = Date.now() - new Date(this.commande.dateCommande).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      this.tempsEcoule = `${hours}h${String(minutes % 60).padStart(2, '0')}`;
    } else {
      this.tempsEcoule = `${minutes} min`;
    }
  }

  /** Couleur de la barre liseré selon statut */
  get lisereColor(): string {
    switch (this.commande.statut) {
      case 'EN_ATTENTE':    return '#f4a52a';
      case 'EN_PREPARATION': return '#2ba8e8';
      case 'PRET':          return '#2fbf6b';
      default:              return '#7e87a8';
    }
  }

  /** Libellé du badge de statut */
  get statutLabel(): string {
    if (this.commande.prioritaire) return '⚡ Priority';
    switch (this.commande.statut) {
      case 'EN_ATTENTE':    return 'Pending';
      case 'EN_PREPARATION': return 'In Progress';
      case 'PRET':          return 'Ready';
      default:              return this.commande.statut;
    }
  }

  /** Classe CSS du badge de statut */
  get statutBadgeClass(): string {
    if (this.commande.prioritaire) return 'badge--priority';
    switch (this.commande.statut) {
      case 'EN_ATTENTE':    return 'badge--pending';
      case 'EN_PREPARATION': return 'badge--inprogress';
      case 'PRET':          return 'badge--ready';
      default:              return 'badge--pending';
    }
  }

  onPrendreEnCharge() {
    this.changerStatut.emit({ id: this.commande.id, statut: 'EN_PREPARATION' });
  }

  onMarquerPret() {
    this.changerStatut.emit({ id: this.commande.id, statut: 'PRET' });
  }
}
