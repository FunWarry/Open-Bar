import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {exhaustMap, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';
import {AuthService} from '../services/auth.service';
import * as AuthActions from './auth.actions';
import {NavigationService} from '../services/navigation.service';

@Injectable()
export class AuthEffects {

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({email, password}) =>
        this.authService.login(email, password).pipe(
          map(response => {
            console.log('Login réussi');
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

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        console.log('Effet logout déclenché');
        this.authService.logout();

        // Navigation après délai pour permettre la mise à jour du state
        setTimeout(() => {
          this.navigationService.navigateToLogin();
        }, 300);
      }),
      map(() => AuthActions.logoutSuccess())
    )
  );

  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private navigationService: NavigationService
  ) {
  }
}

