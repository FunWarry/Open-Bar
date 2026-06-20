import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {add, eye, create, trash, chevronForward} from 'ionicons/icons';
import {NgIf, NgFor, AsyncPipe, CurrencyPipe} from '@angular/common';

@Component({
  selector: 'app-commande-list',
  templateUrl: './commande-list.component.html',
  styleUrls: ['./commande-list.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    NgIf, NgFor, AsyncPipe, CurrencyPipe
  ]
})
export class CommandeListComponent implements OnInit {
  items: any[] = [];
  isAdmin$: Observable<boolean>;

  constructor(private store: Store) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({add, eye, create, trash, chevronForward});
  }

  ngOnInit(): void {
    // TODO: Charger les commandes depuis le store
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EN_ATTENTE': return 'warning';
      case 'EN_PREPARATION': return 'tertiary';
      case 'PRETE': return 'success';
      case 'SERVIE': return 'medium';
      case 'ANNULEE': return 'danger';
      default: return 'primary';
    }
  }

  trackById(index: number, item: any): any {
    return item.id ?? index;
  }

  onAdd(): void {
    // TODO: Naviguer vers le formulaire de création
  }

  onView(commande: any): void {
    // TODO: Naviguer vers la vue détaillée
  }

  onEdit(commande: any): void {
    // TODO: Naviguer vers le formulaire d'édition
  }

  onDelete(commande: any): void {
    // TODO: Supprimer la commande
  }
}
