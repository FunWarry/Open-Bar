import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
    CommonModule, RouterModule,
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

  /** Libellé du statut affiché */
  get statutLabel(): string {
    if (!this.table?.occupee) return 'Libre';
    if (this.commandesEnCours > 0) return 'En cours';
    return 'Occupée';
  }

  /** Classe CSS de la carte selon statut Figma */
  get statutClass(): string {
    if (!this.table?.occupee) return 'table-free';
    if (this.commandesEnCours > 0) return 'table-inprogress';
    return 'table-occupied';
  }

  /** Nombre de commandes actives en cours de préparation */
  get commandesEnCours(): number {
    return (this.table?.commandesActives ?? [])
      .filter(c => c.statut === 'EN_PREPARATION').length;
  }

  /** Nombre total de commandes actives */
  get totalCommandes(): number {
    return (this.table?.commandesActives ?? []).length;
  }
}
