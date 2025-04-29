import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {User} from '../../models/user.model';
import {selectCurrentUser} from '../../store/auth.selectors';
import {AuthService} from '../../services/auth.service';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatListModule} from '@angular/material/list';

@Component({
  selector: 'app-header',
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <span>Gestion Cocktail</span>
      <span class="spacer"></span>
      <ng-container *ngIf="currentUser$ | async as user">
        <button mat-button [matMenuTriggerFor]="userMenu">
          {{ user.username }}
          <mat-icon>arrow_drop_down</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="onLogout()">
            <mat-icon>exit_to_app</mat-icon>
            <span>Déconnexion</span>
          </button>
        </mat-menu>
      </ng-container>
    </mat-toolbar>
    <mat-sidenav-container>
      <mat-sidenav #sidenav mode="side">
        <mat-nav-list>
          <a mat-list-item routerLink="/cocktails" routerLinkActive="active">
            <mat-icon>local_bar</mat-icon>
            <span>Cocktails</span>
          </a>
          <a mat-list-item routerLink="/commandes" routerLinkActive="active">
            <mat-icon>receipt</mat-icon>
            <span>Commandes</span>
          </a>
          <a mat-list-item routerLink="/tables" routerLinkActive="active">
            <mat-icon>table_bar</mat-icon>
            <span>Tables</span>
          </a>
          <ng-container *ngIf="(currentUser$ | async)?.roles?.includes('ADMIN')">
            <a mat-list-item routerLink="/ingredients" routerLinkActive="active">
              <mat-icon>inventory</mat-icon>
              <span>Ingrédients</span>
            </a>
            <a mat-list-item routerLink="/admin" routerLinkActive="active">
              <mat-icon>admin_panel_settings</mat-icon>
              <span>Administration</span>
            </a>
          </ng-container>
        </mat-nav-list>
      </mat-sidenav>
    </mat-sidenav-container>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }
    mat-sidenav {
      width: 250px;
    }
    mat-nav-list a {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .active {
      background-color: rgba(0, 0, 0, 0.04);
    }
  `],
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatSidenavModule, MatListModule]
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(
    private store: Store,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.store.select(selectCurrentUser);
  }

  ngOnInit(): void {
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
