import {createReducer, on} from '@ngrx/store';
import {User} from '../models/user.model';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  error: null
};

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
  on(AuthActions.logout, () => ({
    ...initialState
  })),
  on(AuthActions.initAuthFromStorage, (state, { token }) => ({
    ...state,
    token,
    isAuthenticated: !!token,
    error: null
  }))
);
