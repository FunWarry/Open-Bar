import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import * as AuthActions from './auth.actions';
import { User } from '../models/user.model';

@Injectable()
export class AuthEffects {

  constructor(
    private readonly actions$: Actions,
    private readonly authService: AuthService
  ) {}

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      mergeMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map(response => {
            const user: User = {
              id: response.id,
              email: response.email,
              username: response.username,
              roles: response.roles,
              enabled: response.enabled,
              createdAt: new Date(response.createdAt),
              updatedAt: new Date(response.updatedAt)
            };
            return AuthActions.loginSuccess({ user, token: response.token });
          }),
          catchError(error => of(AuthActions.loginFailure({ error: error.message })))
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => this.authService.logout()),
      map(() => AuthActions.logoutSuccess()),
      catchError(error => of(AuthActions.logoutFailure({ error: error.message })))
    )
  );
  
}
