import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser} from '../../core/store/auth.selectors';
import {MatCardModule} from '@angular/material/card';
import {MatCardHeader, MatCardTitle, MatCardContent} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import { NgIf, AsyncPipe } from '@angular/common';
@Component({
  selector: 'app-home',
  template: `
    <div class="home-container">
      <mat-card class="welcome-card">
        <mat-card-header>
          <mat-card-title>Bienvenue sur Gestion Cocktail</mat-card-title>
          <mat-card-subtitle *ngIf="currentUser$ | async as user">
            Connecté en tant que {{ user.username }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>
            Cette application vous permet de gérer vos cocktails, ingrédients et recettes.
            Commencez par explorer les différentes fonctionnalités disponibles.
          </p>
        </mat-card-content>
      </mat-card>

      <div class="features-grid">
        <mat-card class="feature-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>local_bar</mat-icon>
            <mat-card-title>Cocktails</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Gérez votre collection de cocktails et leurs recettes.</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="feature-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>inventory_2</mat-icon>
            <mat-card-title>Ingrédients</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Suivez vos stocks d'ingrédients et leurs quantités.</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="feature-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>restaurant_menu</mat-icon>
            <mat-card-title>Recettes</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Créez et partagez vos recettes de cocktails.</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="feature-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>event</mat-icon>
            <mat-card-title>Événements</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Planifiez vos événements et gérez les cocktails servis.</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-card {
      margin-bottom: 30px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .feature-card {
      height: 100%;
      transition: transform 0.2s;

      &:hover {
        transform: translateY(-5px);
      }
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      line-height: 40px;
    }
  `],
  standalone: true,
  imports: [MatCardModule, MatCardHeader, MatCardTitle, MatCardContent, MatIconModule, NgIf, AsyncPipe]
})
export class HomeComponent implements OnInit {
  currentUser$: Observable<any>;

  constructor(private store: Store) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
  }
}
