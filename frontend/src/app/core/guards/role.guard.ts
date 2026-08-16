import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, Observable, of, take} from 'rxjs';
import {selectCurrentUser} from '../store/auth.selectors';

/**
 * Role-Based Access Control (RBAC) route guard restricting route access according to required roles specified in {@code route.data.roles}.
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  /**
   * Constructs the guard with NgRx store and Router dependencies.
   *
   * @param store Centralized NgRx store
   * @param router Angular Router
   */
  constructor(private readonly store: Store, private readonly router: Router) {
  }

  /**
   * Verifies if the authenticated user has at least one of the required roles to access the route.
   *
   * @param route Metadata and parameters of the activated route
   * @returns Observable emitting {@code true} if authorized, or {@code false} with redirection otherwise
   */
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const allowedRoles: string[] = route.data?.['roles'] ?? [];
    if (!allowedRoles.length) {
      console.error('RoleGuard: data.roles missing on route', route.url.toString());
      this.router.navigate(['/']);
      return of(false);
    }
    return this.store.select(selectCurrentUser).pipe(
      take(1),
      map(user => {
        const hasRole = allowedRoles.some(role => user?.roles?.includes(role));
        if (hasRole) {
          return true;
        }
        this.router.navigate(['/']);
        return false;
      })
    );
  }
}
