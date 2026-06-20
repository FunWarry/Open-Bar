import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {add, create, trash, chevronForward} from 'ionicons/icons';
import {NgIf, NgFor, AsyncPipe, CurrencyPipe} from '@angular/common';

@Component({
  selector: 'app-cocktail-list',
  templateUrl: './cocktail-list.component.html',
  styleUrls: ['./cocktail-list.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    NgIf, NgFor, AsyncPipe, CurrencyPipe
  ]
})
export class CocktailListComponent implements OnInit {
  items: any[] = [];
  isAdmin$: Observable<boolean>;

  constructor(private store: Store) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({add, create, trash, chevronForward});
  }

  ngOnInit(): void {
    // TODO: Charger les cocktails depuis le store
  }

  trackById(index: number, item: any): any {
    return item.id ?? index;
  }

  onAdd(): void {
    // TODO: Naviguer vers le formulaire de création
  }

  onEdit(cocktail: any): void {
    // TODO: Naviguer vers le formulaire d'édition
  }

  onDelete(cocktail: any): void {
    // TODO: Supprimer le cocktail
  }
}
