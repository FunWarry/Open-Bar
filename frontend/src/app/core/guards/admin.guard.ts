import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {selectCurrentUser} from '../store/auth.selectors';

/**
 * Route guard restricting access to users with the {@code ADMIN} role.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  /**
   * Constructs the guard with NgRx store and Router dependencies.
   *
   * @param store Centralized NgRx Store
   * @param router Angular Router
   */
  constructor(private readonly store: Store, private readonly router: Router) {
  }

  /**
   * Verifies if the authenticated user has the ADMIN role.
   *
   * @returns Observable emitting {@code true} if admin, or redirecting to home otherwise.
   */
  canActivate(): Observable<boolean | UrlTree> {
    return this.store.select(selectCurrentUser).pipe(
      take(1),
      map(user => {
        if (user?.roles.includes('ADMIN')) {
          return true;
        }
        return this.router.createUrlTree(['/']);
      })
    );
  }
}
