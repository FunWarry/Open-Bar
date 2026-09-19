import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { selectIsAuthenticated } from '../store/auth.selectors';
import { logout, initAuthFromStorage } from '../store/auth.actions';
import { SetupService } from '../services/setup.service';
import { AuthService } from '../services/auth.service';
import { isJwtExpired } from '../utils/jwt.util';

/**
 * Angular authentication route guard protecting endpoints that require an authenticated user.
 * Redirects to /setup if system is uninitialized, or to /auth/login if unauthenticated.
 * Proactively refreshes expired tokens or redirects directly to login.
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
        return this.checkAuthentication();
      }),
      catchError(() => this.checkAuthentication())
    );
  }

  /**
   * Validates user authentication state and token expiration.
   * Proactively refreshes the token if expired or purges stale session and redirects to login.
   *
   * @returns Observable emitting {@code true} or redirection {@link UrlTree}
   */
  private checkAuthentication(): Observable<boolean | UrlTree> {
    const token = this.authService.getToken();
    const refreshToken = this.authService.getRefreshToken();

    // No token at all -> redirect to login immediately
    if (!token) {
      this.authService.logout();
      this.store.dispatch(logout());
      return of(this.router.createUrlTree(['/auth/login']));
    }

    // Token is expired -> refresh proactively or redirect to login
    if (isJwtExpired(token)) {
      if (refreshToken) {
        return this.authService.refreshToken().pipe(
          map(tokens => {
            const user = this.authService.getStoredUser();
            if (user) {
              this.store.dispatch(initAuthFromStorage({ token: tokens.accessToken, user }));
            }
            return true;
          }),
          catchError(() => {
            this.authService.logout();
            this.store.dispatch(logout());
            return of(this.router.createUrlTree(['/auth/login']));
          })
        );
      }

      this.authService.logout();
      this.store.dispatch(logout());
      return of(this.router.createUrlTree(['/auth/login']));
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
  }
}
