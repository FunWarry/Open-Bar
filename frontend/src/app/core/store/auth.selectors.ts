import {createFeatureSelector, createSelector} from '@ngrx/store';
import {AuthState} from './auth.reducer';

/** Selecteur NgRx de niveau fonctionnalité pour l'état d'authentification. */
export const selectAuthState = createFeatureSelector<AuthState>('auth');

/** Selecteur du jeton JWT d'accès. */
export const selectAuthToken = createSelector(
  selectAuthState,
  (state: AuthState) => state.token
);

/** Selecteur indiquant si l'utilisateur est actuellement authentifié. */
export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => !!state.token
);

/** Selecteur du profil de l'utilisateur actuellement connecté. */
export const selectCurrentUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

/** Selecteur du message d'erreur d'authentification éventuel. */
export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

/** Selecteur indiquant si l'utilisateur possède le rôle ADMIN. */
export const selectIsAdmin = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('ADMIN') ?? false
);

/** Selecteur indiquant si l'utilisateur possède le rôle MANAGER. */
export const selectIsManager = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('MANAGER') ?? false
);

/** Selecteur indiquant si l'utilisateur possède le rôle BARMAN. */
export const selectIsBarman = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('BARMAN') ?? false
);

/** Selecteur indiquant si l'utilisateur possède le rôle SERVEUR. */
export const selectIsServeur = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.includes('SERVEUR') ?? false
);

/** Selecteur indiquant si l'utilisateur peut gérer les ingrédients et seuils d'alerte (ADMIN, MANAGER ou BARMAN). */
export const selectCanEditIngredient = createSelector(
  selectCurrentUser,
  (user) => user?.roles?.some(r => r === 'ADMIN' || r === 'MANAGER' || r === 'BARMAN') ?? false
);
