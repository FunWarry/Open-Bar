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
import {NgIf, NgFor, AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  styleUrls: ['./ingredient-list.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon, IonButton, IonButtons,
    NgIf, NgFor, AsyncPipe
  ]
})
export class IngredientListComponent implements OnInit {
  items: any[] = [];
  isAdmin$: Observable<boolean>;

  constructor(private store: Store) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({add, eye, create, trash, chevronForward});
  }

  ngOnInit(): void {
    // TODO: Charger les ingrédients depuis le store
  }

  getStockColor(stock: number): string {
    if (stock <= 0) return 'danger';
    if (stock < 10) return 'warning';
    return 'success';
  }

  trackById(index: number, item: any): any {
    return item.id ?? index;
  }

  onAdd(): void {
    // TODO: Naviguer vers le formulaire de création
  }

  onView(ingredient: any): void {
    // TODO: Naviguer vers la vue détaillée
  }

  onEdit(ingredient: any): void {
    // TODO: Naviguer vers le formulaire d'édition
  }

  onDelete(ingredient: any): void {
    // TODO: Supprimer l'ingrédient
  }
}
