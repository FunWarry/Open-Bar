import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonButtons
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {add, eye, create, people, checkmarkCircle, closeCircle} from 'ionicons/icons';
import {NgIf, NgFor, AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-table-list',
  templateUrl: './table-list.component.html',
  styleUrls: ['./table-list.component.css'],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonBadge, IonIcon, IonButton, IonButtons,
    NgIf, NgFor, AsyncPipe
  ]
})
export class TableListComponent implements OnInit {
  tables: any[] = [];
  isAdmin$: Observable<boolean>;

  constructor(private store: Store) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
    addIcons({add, eye, create, people, checkmarkCircle, closeCircle});
  }

  ngOnInit(): void {
    // TODO: Charger les tables depuis le store
  }

  onAdd(): void {
    // TODO: Naviguer vers le formulaire de création
  }

  onView(table: any): void {
    // TODO: Naviguer vers la vue détaillée
  }

  onEdit(table: any): void {
    // TODO: Naviguer vers le formulaire d'édition
  }
}
