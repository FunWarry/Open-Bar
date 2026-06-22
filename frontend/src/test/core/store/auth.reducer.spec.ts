import { authReducer, AuthState, initialState } from '../../../app/core/store/auth.reducer';
import * as AuthActions from '../../../app/core/store/auth.actions';
import { User } from '../../../app/core/models/user.model';

const mockUser: User = {
  id: 1,
  email: 'test@bar.com',
  username: 'testuser',
  roles: ['SERVEUR'],
  enabled: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('authReducer', () => {
  describe('état initial', () => {
    it('initialState_appelSansAction_retourneEtatVide', () => {
      const state = authReducer(undefined, { type: '@@INIT' } as any);
      expect(state).toEqual(initialState);
    });

    it('initialState_valeurs_toutesNullesEtNonAuthentifie', () => {
      expect(initialState.user).toBeNull();
      expect(initialState.token).toBeNull();
      expect(initialState.isAuthenticated).toBeFalse();
      expect(initialState.error).toBeNull();
    });
  });

  describe('loginSuccess', () => {
    it('loginSuccess_avecUserEtToken_metsAJourUserTokenEtIsAuthenticated', () => {
      const action = AuthActions.loginSuccess({ user: mockUser, token: 'jwt-token-123' });
      const state = authReducer(initialState, action);

      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('jwt-token-123');
      expect(state.isAuthenticated).toBeTrue();
      expect(state.error).toBeNull();
    });

    it('loginSuccess_avecErreurPrecedente_effaceLErreur', () => {
      const stateWithError: AuthState = { ...initialState, error: 'Erreur précédente' };
      const action = AuthActions.loginSuccess({ user: mockUser, token: 'tok' });
      const state = authReducer(stateWithError, action);

      expect(state.error).toBeNull();
      expect(state.isAuthenticated).toBeTrue();
    });

    it('loginSuccess_remplaceAncienUser_parNouveauUser', () => {
      const oldUser: User = { ...mockUser, id: 99, email: 'old@bar.com' };
      const stateWithOldUser: AuthState = {
        user: oldUser,
        token: 'old-token',
        isAuthenticated: true,
        error: null,
      };
      const newUser: User = { ...mockUser, id: 2, email: 'new@bar.com' };
      const action = AuthActions.loginSuccess({ user: newUser, token: 'new-token' });
      const state = authReducer(stateWithOldUser, action);

      expect(state.user).toEqual(newUser);
      expect(state.token).toBe('new-token');
    });
  });

  describe('loginFailure', () => {
    it('loginFailure_avecMessage_stockeLErreur', () => {
      const action = AuthActions.loginFailure({ error: 'Identifiants invalides' });
      const state = authReducer(initialState, action);

      expect(state.error).toBe('Identifiants invalides');
    });

    it('loginFailure_necrasePasUserExistant', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        token: 'tok',
        isAuthenticated: true,
        error: null,
      };
      const action = AuthActions.loginFailure({ error: 'Session expirée' });
      const state = authReducer(stateWithUser, action);

      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('tok');
      expect(state.isAuthenticated).toBeTrue();
      expect(state.error).toBe('Session expirée');
    });

    it('loginFailure_remplaceErreurPrecedente_parNouvelleErreur', () => {
      const stateWithError: AuthState = { ...initialState, error: 'Ancienne erreur' };
      const action = AuthActions.loginFailure({ error: 'Nouvelle erreur' });
      const state = authReducer(stateWithError, action);

      expect(state.error).toBe('Nouvelle erreur');
    });
  });

  describe('logout', () => {
    it('logout_depuisEtatAuthentifie_neModifiePasEtat', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        token: 'tok',
        isAuthenticated: true,
        error: null,
      };
      const action = AuthActions.logout();
      const state = authReducer(stateWithUser, action);

      // logout (sans Success) ne réinitialise pas l'état — c'est l'effect qui déclenche logoutSuccess
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('tok');
      expect(state.isAuthenticated).toBeTrue();
    });

    it('logout_depuisEtatInitial_conserveEtatInitial', () => {
      const action = AuthActions.logout();
      const state = authReducer(initialState, action);

      expect(state).toEqual(initialState);
    });
  });

  describe('logoutSuccess', () => {
    it('logoutSuccess_depuisEtatAuthentifie_reinitialiseCompletement', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        token: 'tok',
        isAuthenticated: true,
        error: null,
      };
      const action = AuthActions.logoutSuccess();
      const state = authReducer(stateWithUser, action);

      expect(state).toEqual(initialState);
    });

    it('logoutSuccess_viderToken_isAuthenticatedRepasseAFalse', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        token: 'tok',
        isAuthenticated: true,
        error: null,
      };
      const action = AuthActions.logoutSuccess();
      const state = authReducer(stateWithUser, action);

      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBeFalse();
    });

    it('logoutSuccess_avecErreur_effaceEgalementLErreur', () => {
      const stateWithError: AuthState = { ...initialState, error: 'Erreur quelconque' };
      const action = AuthActions.logoutSuccess();
      const state = authReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('initAuthFromStorage', () => {
    it('initAuthFromStorage_avecToken_setTokenEtIsAuthenticated', () => {
      const action = AuthActions.initAuthFromStorage({ token: 'stored-token' });
      const state = authReducer(initialState, action);

      expect(state.token).toBe('stored-token');
      expect(state.isAuthenticated).toBeTrue();
      expect(state.error).toBeNull();
    });

    it('initAuthFromStorage_avecTokenVide_isAuthenticatedResteFalse', () => {
      const action = AuthActions.initAuthFromStorage({ token: '' });
      const state = authReducer(initialState, action);

      expect(state.token).toBe('');
      expect(state.isAuthenticated).toBeFalse();
    });

    it('initAuthFromStorage_necrasePasUserExistant', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        token: 'old-token',
        isAuthenticated: true,
        error: null,
      };
      const action = AuthActions.initAuthFromStorage({ token: 'new-stored-token' });
      const state = authReducer(stateWithUser, action);

      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('new-stored-token');
      expect(state.isAuthenticated).toBeTrue();
    });

    it('initAuthFromStorage_effaceLErreur', () => {
      const stateWithError: AuthState = { ...initialState, error: 'Erreur présente' };
      const action = AuthActions.initAuthFromStorage({ token: 'tok' });
      const state = authReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('immutabilité', () => {
    it('loginSuccess_neModifiePasEtatOriginal', () => {
      const originalState: AuthState = { ...initialState };
      const action = AuthActions.loginSuccess({ user: mockUser, token: 'tok' });
      authReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('logoutSuccess_retourneNouvelObjetEtatInitial', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        token: 'tok',
        isAuthenticated: true,
        error: null,
      };
      const action = AuthActions.logoutSuccess();
      const newState = authReducer(stateWithUser, action);

      expect(newState).not.toBe(stateWithUser);
      expect(newState).toEqual(initialState);
    });
  });
});
