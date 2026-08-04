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
 * Helper function to hydrate initial AuthState from LocalStorage on application startup.
 */
export function getInitialAuthState(): AuthState {
  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('auth_user');
      if (token && userJson) {
        const user = JSON.parse(userJson);
        return {
          user,
          token,
          isAuthenticated: true,
          error: null
        };
      }
    }
  } catch {
    // Ignoré si localStorage est indisponible ou corrompu
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    error: null
  };
}

/**
 * État initial du store NgRx d'authentification (réhydraté depuis LocalStorage).
 */
export const initialState: AuthState = getInitialAuthState();

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
    user: null,
    token: null,
    isAuthenticated: false,
    error: null
  })),
  on(AuthActions.initAuthFromStorage, (state, {token, user}) => ({
    ...state,
    token,
    user: user !== undefined ? user : state.user,
    isAuthenticated: !!token,
    error: null
  })),
  on(AuthActions.setCurrentUser, (state, {user}) => ({
    ...state,
    user
  }))
);
