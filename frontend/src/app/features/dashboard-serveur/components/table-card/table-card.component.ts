import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { TableView } from '../../models/table-view.model';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, restaurantOutline, checkmarkOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [
    CommonModule, RouterModule, TranslocoModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon
  ],
  templateUrl: './table-card.component.html',
  styleUrls: ['./table-card.component.scss'],
})
export class TableCardComponent {
  @Input() table!: TableView;
  @Output() liberer = new EventEmitter<number>();
  @Output() selectionner = new EventEmitter<TableView>();

  constructor() {
    addIcons({ peopleOutline, restaurantOutline, checkmarkOutline, timeOutline });
  }

  /** Displayed status i18n key */
  get statutKey(): string {
    if (!this.table?.occupee) return 'TABLE_CARD.STATUS_FREE';
    if (this.commandesEnCours > 0) return 'TABLE_CARD.STATUS_IN_PROGRESS';
    return 'TABLE_CARD.STATUS_OCCUPIED';
  }

  /** Backwards compatibility label */
  get statutLabel(): string {
    if (!this.table?.occupee) return 'Libre';
    if (this.commandesEnCours > 0) return 'En cours';
    return 'Occupée';
  }

  /** CSS class for card based on Figma status */
  get statutClass(): string {
    if (!this.table?.occupee) return 'table-free';
    if (this.commandesEnCours > 0) return 'table-inprogress';
    return 'table-occupied';
  }

  /** Number of active orders in preparation */
  get commandesEnCours(): number {
    return (this.table?.commandesActives ?? [])
      .filter(c => c.statut === 'EN_PREPARATION').length;
  }

  /** Number of orders ready to serve */
  get commandesPretes(): number {
    return (this.table?.commandesActives ?? [])
      .filter(c => c.statut === 'PRET' || c.statut === 'PRETE').length;
  }

  /** Whether the table has at least one order ready */
  get hasCommandePrete(): boolean {
    return this.commandesPretes > 0;
  }

  /** Total number of active orders */
  get totalCommandes(): number {
    return (this.table?.commandesActives ?? []).length;
  }
}
