import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {selectIsAuthenticated} from '../store/auth.selectors';

/**
 * Guard d'authentification Angular pour protéger les routes nécessitant un utilisateur connecté.
 * Redirige l'utilisateur non authentifié vers la page de login (/auth/login).
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  /**
   * Constructeur avec injection du Store NgRx et du Router Angular.
   *
   * @param store Store NgRx centralisé
   * @param router Service de navigation Angular
   */
  constructor(private readonly store: Store, private readonly router: Router) {
  }

  /**
   * Détermine si la route peut être activée.
   *
   * @returns Un {@link Observable} émettant {@code true} si authentifié, ou un {@link UrlTree} de redirection vers /auth/login sinon.
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
