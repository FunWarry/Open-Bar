import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, Observable, of, take} from 'rxjs';
import {selectCurrentUser} from '../store/auth.selectors';

/**
 * Guard de contrôle des rôles utilisateur (RBAC) pour restreindre l'accès à une route selon les rôles spécifiés dans {@code route.data.roles}.
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  /**
   * Constructeur avec injection du Store NgRx et du Router.
   *
   * @param store Store NgRx centralisé
   * @param router Router d'Angular
   */
  constructor(private readonly store: Store, private readonly router: Router) {
  }

  /**
   * Vérifie si l'utilisateur possède au moins un des rôles requis pour accéder à la route.
   *
   * @param route Métadonnées et paramètres de la route activée
   * @returns Observable émettant {@code true} si autorisé, ou {@code false} avec redirection sinon
   */
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
