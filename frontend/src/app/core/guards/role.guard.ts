import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, Observable, of, take} from 'rxjs';
import {selectCurrentUser} from '../store/auth.selectors';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private store: Store,
    private router: Router
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const allowedRoles: string[] = route.data?.['roles'] ?? [];
    if (!allowedRoles.length) {
      console.error('RoleGuard: data.roles manquant sur la route', route.url.toString());
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
