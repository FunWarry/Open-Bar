import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectCurrentUser, selectIsAdmin, selectIsBarman, selectIsManager, selectIsServeur } from '../../core/store/auth.selectors';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { ActionButtonComponent } from '../../core/components/ui/action-button/action-button.component';
import { RoleBadgeComponent } from '../../core/components/ui/role-badge/role-badge.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink, ActionButtonComponent, RoleBadgeComponent, TranslocoPipe]
})
export class HomeComponent {
  currentUser$: Observable<any>;
  isAdmin$: Observable<boolean>;
  isManager$: Observable<boolean>;
  isBarman$: Observable<boolean>;
  isServeur$: Observable<boolean>;

  constructor(
    private readonly store: Store,
    private readonly router: Router
  ) {
    this.currentUser$ = this.store.select(selectCurrentUser);
    this.isAdmin$ = this.store.select(selectIsAdmin);
    this.isManager$ = this.store.select(selectIsManager);
    this.isBarman$ = this.store.select(selectIsBarman);
    this.isServeur$ = this.store.select(selectIsServeur);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
