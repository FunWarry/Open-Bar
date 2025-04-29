import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectIsAdmin} from '../../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatChip, MatChipsModule} from '@angular/material/chips';
import { NgIf, DatePipe, CurrencyPipe, AsyncPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
@Component({
    selector: 'app-table-detail',
    template: `
    <div class="table-detail-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Table {{table?.number}}</mat-card-title>
          <div class="header-actions">
            <button mat-button color="primary" (click)="onBack()">
              <mat-icon>arrow_back</mat-icon>
              Retour
            </button>
            <button *ngIf="isAdmin$ | async" mat-raised-button color="accent" (click)="onEdit()">
              <mat-icon>edit</mat-icon>
              Modifier
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="detail-section">
            <h3>Informations</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Zone:</span>
                <span class="value">{{table?.zone}}</span>
              </div>
              <div class="detail-item">
                <span class="label">Capacité:</span>
                <span class="value">{{table?.capacity}} personnes</span>
              </div>
              <div class="detail-item">
                <span class="label">Statut:</span>
                <mat-chip [color]="table?.occupied ? 'warn' : 'primary'" selected>
                  {{table?.occupied ? 'Occupée' : 'Libre'}}
                </mat-chip>
              </div>
            </div>
          </div>

          <div class="detail-section" *ngIf="table?.currentCommande">
            <h3>Commande en cours</h3>
            <mat-card>
              <mat-card-content>
                <div class="commande-info">
                  <p><strong>Numéro:</strong> {{table.currentCommande.id}}</p>
                  <p><strong>Statut:</strong> {{table.currentCommande.status}}</p>
                  <p><strong>Total:</strong> {{table.currentCommande.total | currency:'EUR'}}</p>
                </div>
                <div class="commande-actions">
                  <button mat-button color="primary" (click)="onViewCommande()">
                    <mat-icon>visibility</mat-icon>
                    Voir la commande
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="detail-section">
            <h3>Historique des commandes</h3>
            <table mat-table [dataSource]="commandesDataSource" class="full-width">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>Numéro</th>
                <td mat-cell *matCellDef="let commande">{{commande.id}}</td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let commande">{{commande.date | date:'short'}}</td>
              </ng-container>

              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let commande">{{commande.total | currency:'EUR'}}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Statut</th>
                <td mat-cell *matCellDef="let commande">
                  <mat-chip [color]="getStatusColor(commande.status)" selected>
                    {{commande.status}}
                  </mat-chip>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .table-detail-container {
      padding: 20px;
    }
    .header-actions {
      display: flex;
      gap: 16px;
      margin-left: auto;
    }
    .detail-section {
      margin-bottom: 24px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .label {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }
    .value {
      font-size: 16px;
    }
    .commande-info {
      margin-bottom: 16px;
    }
    .commande-actions {
      display: flex;
      justify-content: flex-end;
    }
    .full-width {
      width: 100%;
    }
  `],
    standalone: true,
    imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, MatButtonModule, MatChipsModule, NgIf, MatChip, MatTableModule, DatePipe, CurrencyPipe, AsyncPipe]
})
export class TableDetailComponent implements OnInit {
  table: any; // TODO: Remplacer par le type Table
  isAdmin$: Observable<boolean>;
  commandesDataSource: any[] = []; // TODO: Remplacer par le type Commande[]
  displayedColumns: string[] = ['id', 'date', 'total', 'status'];

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.isAdmin$ = this.store.select(selectIsAdmin);
  }

  ngOnInit(): void {
    const tableId = this.route.snapshot.params['id'];
    // TODO: Charger les données de la table depuis le store
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

  onBack(): void {
    this.router.navigate(['/tables']);
  }

  onEdit(): void {
    this.router.navigate(['/tables', this.table.id, 'edit']);
  }

  onViewCommande(): void {
    if (this.table?.currentCommande) {
      this.router.navigate(['/commandes', this.table.currentCommande.id]);
    }
  }
}
