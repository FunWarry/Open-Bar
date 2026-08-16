import {createReducer, on} from '@ngrx/store';
import {User} from '../models/user.model';
import * as AuthActions from './auth.actions';

/**
 * Interface representing the state of the NgRx authentication store.
 */
export interface AuthState {
  /** Authenticated user profile or {@code null} */
  user: User | null;
  /** JWT access token or {@code null} */
  token: string | null;
  /** Flag indicating authentication state */
  isAuthenticated: boolean;
  /** Authentication error message if any */
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
    // Ignored if localStorage is unavailable or corrupt
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    error: null
  };
}

/**
 * Initial state of the NgRx authentication store (hydrated from LocalStorage).
 */
export const initialState: AuthState = getInitialAuthState();

/**
 * NgRx Reducer handling authentication state mutations.
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
