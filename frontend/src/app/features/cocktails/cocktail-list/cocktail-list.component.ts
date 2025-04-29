import {Component, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTableModule} from '@angular/material/table';
import {MatSortModule} from '@angular/material/sort';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { CurrencyPipe } from '@angular/common';
@Component({
    selector: 'app-cocktail-list',
    template: `
    <div class="cocktail-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Liste des Cocktails</mat-card-title>
          <button *ngIf="isAdmin$ | async" mat-raised-button color="primary" (click)="onAdd()">
            <mat-icon>add</mat-icon>
            Nouveau Cocktail
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="dataSource" matSort>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom</th>
              <td mat-cell *matCellDef="let cocktail">{{cocktail.name}}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Catégorie</th>
              <td mat-cell *matCellDef="let cocktail">{{cocktail.category}}</td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Prix</th>
              <td mat-cell *matCellDef="let cocktail">{{cocktail.price | currency:'EUR'}}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let cocktail">
                <button mat-icon-button color="primary" (click)="onEdit(cocktail)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="onDelete(cocktail)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of cocktails"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .cocktail-list-container {
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
    table {
      width: 100%;
    }
    .mat-column-actions {
      width: 120px;
      text-align: center;
    }
  `],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatPaginatorModule, MatTableModule, MatSortModule, MatIconModule, MatButtonModule, CurrencyPipe]
})
export class CocktailListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'category', 'price', 'actions'];
  dataSource: MatTableDataSource<any>;
  isAdmin$: Observable<boolean>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private store: Store) {
    this.dataSource = new MatTableDataSource();
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    // TODO: Charger les cocktails depuis le store
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
