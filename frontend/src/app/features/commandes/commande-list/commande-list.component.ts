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
import { CurrencyPipe } from '@angular/common';

@Component({
    selector: 'app-commande-list',
    template: `
    <div class="commande-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Liste des Commandes</mat-card-title>
          <button mat-raised-button color="primary" (click)="onAdd()">
            <mat-icon>add</mat-icon>
            Nouvelle Commande
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="dataSource" matSort>
            <ng-container matColumnDef="table">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Table</th>
              <td mat-cell *matCellDef="let commande">{{commande.table}}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
              <td mat-cell *matCellDef="let commande">
                <mat-chip [color]="getStatusColor(commande.status)" selected>
                  {{commande.status}}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Total</th>
              <td mat-cell *matCellDef="let commande">{{commande.total | currency:'EUR'}}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let commande">
                <button mat-icon-button color="primary" (click)="onView(commande)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button color="accent" (click)="onEdit(commande)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="onDelete(commande)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of commandes"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .commande-list-container {
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
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatPaginatorModule, MatTableModule, MatSortModule, MatIconModule, MatButtonModule, MatChipsModule, CurrencyPipe]
})
export class CommandeListComponent implements OnInit {
  displayedColumns: string[] = ['table', 'status', 'total', 'actions'];
  dataSource: MatTableDataSource<any>;
  isAdmin$: Observable<boolean>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private store: Store) {
    this.dataSource = new MatTableDataSource();
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    // TODO: Charger les commandes depuis le store
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'EN_ATTENTE':
        return 'warn';
      case 'EN_PREPARATION':
        return 'accent';
      case 'PRETE':
        return 'primary';
      case 'SERVIE':
        return 'primary';
      default:
        return 'primary';
    }
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
