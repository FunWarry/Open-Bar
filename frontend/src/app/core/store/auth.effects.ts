import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {exhaustMap, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';
import {AuthService} from '../services/auth.service';
import * as AuthActions from './auth.actions';
import {NavigationService} from '../services/navigation.service';

/**
 * NgRx Effects managing authentication side-effects (HTTP login calls, local storage persistence, and logout redirection).
 */
@Injectable()
export class AuthEffects {

  /**
   * Effect handling {@link AuthActions.login}. Calls the REST authentication API.
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
   * Effect handling {@link AuthActions.logout}. Clears storage and navigates to login.
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
   * Constructs the effects class injecting NgRx actions stream, auth service, and navigation service.
   *
   * @param actions$ NgRx actions stream
   * @param authService Authentication service
   * @param navigationService Navigation service
   */
  constructor(private readonly actions$: Actions, private readonly authService: AuthService, private readonly navigationService: NavigationService) {
  }
}
