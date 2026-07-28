import {createReducer, on} from '@ngrx/store';
import {User} from '../models/user.model';
import * as AuthActions from './auth.actions';

/**
 * Interface représentant l'état du store NgRx d'authentification.
 */
export interface AuthState {
  /** Profil de l'utilisateur connecté ou {@code null} */
  user: User | null;
  /** Jeton JWT d'accès ou {@code null} */
  token: string | null;
  /** Indicateur d'état d'authentification */
  isAuthenticated: boolean;
  /** Message d'erreur d'authentification éventuel */
  error: string | null;
}

/**
 * État initial du store NgRx d'authentification.
 */
export const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  error: null
};

/**
 * Reducer NgRx gérant les mutations de l'état d'authentification.
 */
export const authReducer = createReducer(
  initialState,
  on(AuthActions.loginSuccess, (state, {user, token}) => ({
    ...state,
    user,
    token,
    isAuthenticated: true,
    error: null
  })),
  on(AuthActions.loginFailure, (state, {error}) => ({
    ...state,
    error
  })),
  on(AuthActions.logout, (state) => ({
    ...state
  })),
  on(AuthActions.logoutSuccess, () => ({
    ...initialState
  })),
  on(AuthActions.initAuthFromStorage, (state, {token}) => ({
    ...state,
    token,
    isAuthenticated: !!token,
    error: null
  }))
);
