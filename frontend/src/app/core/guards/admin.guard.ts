import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {selectCurrentUser} from '../store/auth.selectors';

/**
 * Guard spécifique restreignant l'accès d'une route aux seuls utilisateurs possédant le rôle {@code ADMIN}.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  /**
   * Constructeur avec injection du Store NgRx et du Router.
   *
   * @param store Store NgRx centralisé
   * @param router Router d'Angular
   */
  constructor(private readonly store: Store, private readonly router: Router) {
  }

  /**
   * Vérifie si l'utilisateur possède le rôle ADMIN.
   *
   * @returns Observable émettant {@code true} si admin, ou redirection vers l'accueil sinon.
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
