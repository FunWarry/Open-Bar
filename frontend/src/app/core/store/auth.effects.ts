import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {exhaustMap, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';
import {AuthService} from '../services/auth.service';
import * as AuthActions from './auth.actions';
import {NavigationService} from '../services/navigation.service';

/**
 * Effects NgRx gérant les effets de bord d'authentification (appels HTTP de login, stockage local et redirection après logout).
 */
@Injectable()
export class AuthEffects {

  /**
   * Effet gérant l'action {@link AuthActions.login}. Appelle l'API REST de connexion.
   */
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({email, password}) =>
        this.authService.login(email, password).pipe(
          map(response => {
            const user = {
              id: response.id,
              email: response.email,
              username: response.username,
              roles: response.roles,
              enabled: response.enabled,
              createdAt: new Date(response.createdAt),
              updatedAt: new Date(response.updatedAt)
            };
            return AuthActions.loginSuccess({user, token: response.token});
          }),
          catchError(error => of(AuthActions.loginFailure({error: error.message})))
        )
      )
    )
  );

  /**
   * Effet gérant l'action {@link AuthActions.logout}. Purge le stockage et redirige vers la page de login.
   */
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        this.authService.logout();

        setTimeout(() => {
          this.navigationService.navigateToLogin();
        }, 300);
      }),
      map(() => AuthActions.logoutSuccess())
    )
  );

  /**
   * Constructeur avec injection du flux d'actions NgRx, du service d'authentification et du service de navigation.
   *
   * @param actions$ Flux d'actions NgRx
   * @param authService Service d'authentification
   * @param navigationService Service de navigation
   */
  constructor(private readonly actions$: Actions, private readonly authService: AuthService, private readonly navigationService: NavigationService) {
  }
}
