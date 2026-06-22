import {selectIsAdmin, selectIsAuthenticated, selectIsBarman, selectIsManager} from '../../../app/core/store/auth.selectors';
import {AuthState} from '../../../app/core/store/auth.reducer';

function stateWith(roles: string[], token: string | null = 'tok'): { auth: AuthState } {
  return {
    auth: {
      token,
      loading: false,
      error: null,
      user: token ? {id: 1, email: 'test@bar.com', username: 'test', roles, enabled: true, createdAt: '', updatedAt: ''} : null,
    }
  };
}

describe('auth selectors', () => {
  describe('selectIsAuthenticated', () => {
    it('returns true when token is present', () => {
      expect(selectIsAuthenticated(stateWith([]))).toBeTrue();
    });

    it('returns false when token is null', () => {
      expect(selectIsAuthenticated(stateWith([], null))).toBeFalse();
    });
  });

  describe('selectIsAdmin', () => {
    it('returns true for ADMIN role', () => {
      expect(selectIsAdmin(stateWith(['ADMIN']))).toBeTrue();
    });

    it('returns false for non-ADMIN roles', () => {
      expect(selectIsAdmin(stateWith(['MANAGER', 'SERVEUR']))).toBeFalse();
    });

    it('returns false when no user', () => {
      expect(selectIsAdmin(stateWith([], null))).toBeFalse();
    });

    it('returns false for user with empty roles', () => {
      expect(selectIsAdmin(stateWith([]))).toBeFalse();
    });
  });

  describe('selectIsManager', () => {
    it('returns true for MANAGER role', () => {
      expect(selectIsManager(stateWith(['MANAGER']))).toBeTrue();
    });

    it('returns false for ADMIN (not MANAGER)', () => {
      expect(selectIsManager(stateWith(['ADMIN']))).toBeFalse();
    });

    it('returns false when no user', () => {
      expect(selectIsManager(stateWith([], null))).toBeFalse();
    });

    it('returns false for user with empty roles', () => {
      expect(selectIsManager(stateWith([]))).toBeFalse();
    });
  });

  describe('selectIsBarman', () => {
    it('returns true for BARMAN role', () => {
      expect(selectIsBarman(stateWith(['BARMAN']))).toBeTrue();
    });

    it('returns false for old BARMEN typo', () => {
      expect(selectIsBarman(stateWith(['BARMEN']))).toBeFalse();
    });

    it('returns false when no user', () => {
      expect(selectIsBarman(stateWith([], null))).toBeFalse();
    });

    it('returns false for user with empty roles', () => {
      expect(selectIsBarman(stateWith([]))).toBeFalse();
    });
  });
});
