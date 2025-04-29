import {createFeatureSelector, createSelector} from '@ngrx/store';
import {AuthState} from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectAuthToken = createSelector(
  selectAuthState,
  (state: AuthState) => state.token
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => !!state.token
);

export const selectCurrentUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectIsAdmin = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('ADMIN') ?? false
);

export const selectIsBarmen = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('BARMEN') ?? false
);
