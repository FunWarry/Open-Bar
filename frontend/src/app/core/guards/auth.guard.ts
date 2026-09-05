import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { selectIsAuthenticated } from '../store/auth.selectors';
import { SetupService } from '../services/setup.service';
import { AuthService } from '../services/auth.service';

/**
 * Angular authentication route guard protecting endpoints that require an authenticated user.
 * Redirects to /setup if system is uninitialized, or to /auth/login if unauthenticated.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly setupService = inject(SetupService);
  private readonly authService = inject(AuthService);

  /**
   * Determines if the route can be activated.
   *
   * @returns An {@link Observable} emitting {@code true} if authenticated, or a {@link UrlTree} redirecting to /setup or /auth/login.
   */
  canActivate(): Observable<boolean | UrlTree> {
    return this.setupService.getStatus().pipe(
      switchMap(status => {
        if (!status.initialized) {
          this.authService.logout();
          return of(this.router.createUrlTree(['/setup']));
        }
        return this.store.select(selectIsAuthenticated).pipe(
          take(1),
          map(isAuthenticated => {
            if (isAuthenticated) {
              return true;
            }
            return this.router.createUrlTree(['/auth/login']);
          })
        );
      }),
      catchError(() => {
        return this.store.select(selectIsAuthenticated).pipe(
          take(1),
          map(isAuthenticated => {
            if (isAuthenticated) {
              return true;
            }
            return this.router.createUrlTree(['/auth/login']);
          })
        );
      })
    );
  }
}
