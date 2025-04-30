import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { NgFor } from '@angular/common';
import { MatGridListModule, MatGridTile } from '@angular/material/grid-list';

@Component({
    selector: 'app-table-list',
    templateUrl: './table-list.component.html',
    styleUrls: ['./table-list.component.css'],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, MatButtonModule, MatChipsModule, NgFor, MatGridListModule, MatGridTile]
})
export class TableListComponent implements OnInit {
  tables: any[] = []; // TODO: Remplacer par le type Table
  isAdmin$: Observable<boolean>;

  constructor(private store: Store) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
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
