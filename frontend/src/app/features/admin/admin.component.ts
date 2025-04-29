import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {User} from '../../core/models/user.model';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
@Component({
  selector: 'app-admin',
  template: `
    <div class="admin-container">
      <mat-card class="dashboard-card">
        <mat-card-header>
          <mat-card-title>Tableau de bord administrateur</mat-card-title>
          <mat-card-subtitle>
            Bienvenue, {{ (currentUser$ | async)?.username }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="dashboard-grid">
            <mat-card class="stat-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>people</mat-icon>
                <mat-card-title>Utilisateurs</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-value">0</div>
                <div class="stat-label">Utilisateurs actifs</div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button color="primary">
                  <mat-icon>list</mat-icon>
                  Voir la liste
                </button>
              </mat-card-actions>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>local_bar</mat-icon>
                <mat-card-title>Cocktails</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-value">0</div>
                <div class="stat-label">Cocktails enregistrés</div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button color="primary">
                  <mat-icon>list</mat-icon>
                  Voir la liste
                </button>
              </mat-card-actions>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>inventory_2</mat-icon>
                <mat-card-title>Ingrédients</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-value">0</div>
                <div class="stat-label">Ingrédients disponibles</div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button color="primary">
                  <mat-icon>list</mat-icon>
                  Voir la liste
                </button>
              </mat-card-actions>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>event</mat-icon>
                <mat-card-title>Événements</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-value">0</div>
                <div class="stat-label">Événements planifiés</div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button color="primary">
                  <mat-icon>list</mat-icon>
                  Voir la liste
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="admin-actions">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Actions rapides</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              <button mat-raised-button color="primary">
                <mat-icon>person_add</mat-icon>
                Créer un utilisateur
              </button>
              <button mat-raised-button color="accent">
                <mat-icon>add_circle</mat-icon>
                Ajouter un cocktail
              </button>
              <button mat-raised-button color="warn">
                <mat-icon>warning</mat-icon>
                Gérer les rapports
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .stat-card {
      height: 100%;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 500;
      color: #3f51b5;
      margin: 16px 0;
    }

    .stat-label {
      color: rgba(0, 0, 0, 0.54);
      font-size: 0.875rem;
    }

    .admin-actions {
      margin-top: 20px;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .action-buttons button {
      flex: 1;
      min-width: 200px;
    }

    mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      line-height: 40px;
    }
  `],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, MatButtonModule, AsyncPipe]
})
export class AdminComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(private store: Store) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
  }
}
