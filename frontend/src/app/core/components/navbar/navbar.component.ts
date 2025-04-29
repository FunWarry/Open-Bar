import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {selectCurrentUser, selectIsAdmin, selectIsAuthenticated} from '../../store/auth.selectors';
import {NavigationService} from '../../services/navigation.service';
import {AuthService} from '../../services/auth.service';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatListModule} from '@angular/material/list';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
    selector: 'app-navbar',
    template: `
    <mat-toolbar color="primary">
      <span class="logo" (click)="navigationService.navigateToHome()">Gestion Cocktail</span>

      <span class="spacer"></span>

      <ng-container *ngIf="isAuthenticated$ | async">
        <button mat-button (click)="navigationService.navigateToHome()">
          <mat-icon>home</mat-icon>
          Accueil
        </button>

        <ng-container *ngIf="isAdmin$ | async">
          <button mat-button (click)="navigationService.navigateToAdmin()">
            <mat-icon>admin_panel_settings</mat-icon>
            Administration
          </button>
          <button mat-button (click)="navigationService.navigateToRegister()">
            <mat-icon>person_add</mat-icon>
            Créer un utilisateur
          </button>
        </ng-container>

        <button mat-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
          {{ (currentUser$ | async)?.username }}
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="navigationService.navigateToUserProfile()">
            <mat-icon>person</mat-icon>
            <span>Mon profil</span>
          </button>
          <button mat-menu-item (click)="onLogout()">
            <mat-icon>exit_to_app</mat-icon>
            <span>Déconnexion</span>
          </button>
        </mat-menu>
      </ng-container>

      <ng-container *ngIf="!(isAuthenticated$ | async)">
        <button mat-button (click)="navigationService.navigateToLogin()">
          <mat-icon>login</mat-icon>
          Connexion
        </button>
      </ng-container>
    </mat-toolbar>
  `,
    styles: [`
    .logo {
      cursor: pointer;
      font-size: 1.5rem;
      font-weight: 500;
    }
    .spacer {
      flex: 1 1 auto;
    }
    mat-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }
    button {
      margin: 0 8px;
    }
    mat-icon {
      margin-right: 4px;
    }
  `],
    standalone: true,
    imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatListModule, NgIf, AsyncPipe]
})
export class NavbarComponent implements OnInit {
  isAuthenticated$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  currentUser$: Observable<any>;

  constructor(
    private store: Store,
    public navigationService: NavigationService,
    private authService: AuthService
  ) {
    this.isAuthenticated$ = this.store.select(selectIsAuthenticated);
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
  }

  onLogout(): void {
    this.authService.logout();
    this.navigationService.navigateToLogin();
  }
}
