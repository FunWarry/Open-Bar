import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {selectIsAuthenticated} from '../store/auth.selectors';

/**
 * Angular authentication route guard protecting endpoints that require an authenticated user.
 * Redirects unauthenticated users to the login page (/auth/login).
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  /**
   * Constructs the guard with NgRx store and Router dependencies.
   *
   * @param store Centralized NgRx store
   * @param router Angular navigation router
   */
  constructor(private readonly store: Store, private readonly router: Router) {
  }

  /**
   * Determines if the route can be activated.
   *
   * @returns An {@link Observable} emitting {@code true} if authenticated, or a {@link UrlTree} redirecting to /auth/login otherwise.
   */
  canActivate(): Observable<boolean | UrlTree> {
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
