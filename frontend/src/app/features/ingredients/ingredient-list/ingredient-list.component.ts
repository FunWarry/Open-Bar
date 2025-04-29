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
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-ingredient-list',
  template: `
    <div class="ingredient-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Liste des Ingrédients</mat-card-title>
          <button *ngIf="isAdmin$ | async" mat-raised-button color="primary" (click)="onAdd()">
            <mat-icon>add</mat-icon>
            Nouvel Ingrédient
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="dataSource" matSort>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Nom</th>
              <td mat-cell *matCellDef="let ingredient">{{ingredient.name}}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Catégorie</th>
              <td mat-cell *matCellDef="let ingredient">{{ingredient.category}}</td>
            </ng-container>

            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Stock</th>
              <td mat-cell *matCellDef="let ingredient">
                <mat-chip [color]="getStockColor(ingredient.stock)" selected>
                  {{ingredient.stock}} {{ingredient.unit}}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let ingredient">
                <button mat-icon-button color="primary" (click)="onView(ingredient)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="accent" (click)="onEdit(ingredient)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="onDelete(ingredient)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of ingredients"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .ingredient-list-container {
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
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatPaginatorModule, MatTableModule, MatSortModule, MatIconModule, MatButtonModule, MatChipsModule]
})
export class IngredientListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'category', 'stock', 'actions'];
  dataSource: MatTableDataSource<any>;
  isAdmin$: Observable<boolean>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private store: Store) {
    this.dataSource = new MatTableDataSource();
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    // TODO: Charger les ingrédients depuis le store
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getStockColor(stock: number): string {
    if (stock <= 0) {
      return 'warn';
    } else if (stock < 10) {
      return 'accent';
    }
    return 'primary';
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
