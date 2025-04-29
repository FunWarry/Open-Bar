import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, take} from 'rxjs/operators';
import {selectIsAdmin, selectIsAuthenticated} from '../store/auth.selectors';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  constructor(
    private router: Router,
    private store: Store
  ) {
  }

  navigateToHome(): void {
    this.store.select(selectIsAuthenticated).pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          this.store.select(selectIsAdmin).pipe(
            take(1),
            map(isAdmin => {
              if (isAdmin) {
                this.router.navigate(['/admin']);
              } else {
                this.router.navigate(['/']);
              }
            })
          ).subscribe();
        } else {
          this.router.navigate(['/auth/login']);
        }
      })
    ).subscribe();
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  navigateToAdmin(): void {
    this.store.select(selectIsAdmin).pipe(
      take(1),
      map(isAdmin => {
        if (isAdmin) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      })
    ).subscribe();
  }

  navigateToUserProfile(): void {
    this.store.select(selectIsAuthenticated).pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          this.router.navigate(['/profile']);
        } else {
          this.router.navigate(['/auth/login']);
        }
      })
    ).subscribe();
  }
}
