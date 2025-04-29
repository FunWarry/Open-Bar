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
    template: `
    <div class="table-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Tables</mat-card-title>
          <button *ngIf="isAdmin$ | async" mat-raised-button color="primary" (click)="onAdd()">
            <mat-icon>add</mat-icon>
            Nouvelle Table
          </button>
        </mat-card-header>
        <mat-card-content>
          <mat-grid-list cols="4" rowHeight="200px" gutterSize="16px">
            <mat-grid-tile *ngFor="let table of tables">
              <mat-card class="table-card" [class.occupied]="table.occupied">
                <mat-card-header>
                  <mat-card-title>Table {{table.number}}</mat-card-title>
                  <mat-card-subtitle>{{table.zone}}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <p>Capacité: {{table.capacity}} personnes</p>
                  <p>Statut: {{table.occupied ? 'Occupée' : 'Libre'}}</p>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button color="primary" (click)="onView(table)">
                    <mat-icon>visibility</mat-icon>
                    Détails
                  </button>
                  <button *ngIf="isAdmin$ | async" mat-button color="accent" (click)="onEdit(table)">
                    <mat-icon>edit</mat-icon>
                    Modifier
                  </button>
                </mat-card-actions>
              </mat-card>
            </mat-grid-tile>
          </mat-grid-list>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .table-list-container {
      padding: 20px;
    }
    mat-card {
      margin-bottom: 20px;
    }
    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .table-card {
      width: 100%;
      height: 100%;
      margin: 8px;
    }
    .table-card.occupied {
      background-color: #ffebee;
    }
    mat-card-actions {
      display: flex;
      justify-content: space-around;
      padding: 8px;
    }
  `],
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
