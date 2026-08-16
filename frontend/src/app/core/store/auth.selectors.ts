import {createFeatureSelector, createSelector} from '@ngrx/store';
import {AuthState} from './auth.reducer';

/** Feature-level NgRx selector for authentication state. */
export const selectAuthState = createFeatureSelector<AuthState>('auth');

/** Selector for access JWT token. */
export const selectAuthToken = createSelector(
  selectAuthState,
  (state: AuthState) => state.token
);

/** Selector indicating whether the user is currently authenticated. */
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => !!state.token
);

/** Selector for currently authenticated user profile. */
export const selectCurrentUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

/** Selector for authentication error message if any. */
export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

/** Selector indicating whether the user has ADMIN role. */
export const selectIsAdmin = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('ADMIN') ?? false
);

/** Selector indicating whether the user has MANAGER role. */
export const selectIsManager = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('MANAGER') ?? false
);

/** Selector indicating whether the user has BARMAN role. */
export const selectIsBarman = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('BARMAN') ?? false
);

/** Selector indicating whether the user has SERVEUR role. */
export const selectIsServeur = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('SERVEUR') ?? false
);

/** Selector indicating whether the user can manage ingredients and alert thresholds (ADMIN, MANAGER, or BARMAN). */
export const selectCanEditIngredient = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.some(r => r === 'ADMIN' || r === 'MANAGER' || r === 'BARMAN') ?? false
);

/** Selector indicating whether the user can upload cocktail photos (ADMIN, MANAGER, or BARMAN). */
export const selectCanUploadPhoto = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.some(r => r === 'ADMIN' || r === 'MANAGER' || r === 'BARMAN') ?? false
);
