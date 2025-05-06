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
            map(() => {
              this.router.navigate(['/app-home']).then();
            })
          ).subscribe();
        } else {
          this.router.navigate(['/auth/login']).then();
        }
      })
    ).subscribe();
  }

  navigateToLogin(): void {
    console.log('Navigation vers login - Call stack:', new Error().stack);
    this.router.navigate(['/auth/login']).then();
  }


  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  navigateToAdmin(): void {
    this.store.select(selectIsAdmin).pipe(
      take(1),
      map(isAdmin => {
        if (isAdmin) {
          this.router.navigate(['/admin']).then();
        } else {
          this.router.navigate(['/app-home']).then();
        }
      })
    ).subscribe();
  }

  navigateToUserProfile(): void {
    this.store.select(selectIsAuthenticated).pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          this.router.navigate(['/profile']).then();
        } else {
          this.router.navigate(['/auth/login']).then();
        }
      })
    ).subscribe();
  }
}
