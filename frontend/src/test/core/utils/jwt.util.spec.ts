import { decodeJwtPayload, isJwtExpired } from '../../../app/core/utils/jwt.util';

describe('jwt.util', () => {
  function createTestJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const sig = 'mock_signature';
    return `${header}.${body}.${sig}`;
  }

  describe('decodeJwtPayload', () => {
    it('returns null for null, undefined, or empty token', () => {
      expect(decodeJwtPayload(null)).toBeNull();
      expect(decodeJwtPayload(undefined)).toBeNull();
      expect(decodeJwtPayload('')).toBeNull();
    });

    it('returns null for tokens without exactly three parts', () => {
      expect(decodeJwtPayload('invalid.token')).toBeNull();
      expect(decodeJwtPayload('one.two.three.four')).toBeNull();
    });

    it('returns null for malformed base64 payload', () => {
      expect(decodeJwtPayload('header.invalid-base64-json!.sig')).toBeNull();
    });

    it('decodes valid payload successfully', () => {
      const payload = { sub: 'admin', role: 'ADMIN', exp: 1726000000 };
      const token = createTestJwt(payload);
      const decoded = decodeJwtPayload(token);

      expect(decoded).toEqual(jasmine.objectContaining(payload));
    });
  });

  describe('isJwtExpired', () => {
    it('returns true for null, undefined, or empty token', () => {
      expect(isJwtExpired(null)).toBeTrue();
      expect(isJwtExpired(undefined)).toBeTrue();
      expect(isJwtExpired('')).toBeTrue();
    });

    it('returns true for tokens without an exp claim', () => {
      const token = createTestJwt({ sub: 'user' });
      expect(isJwtExpired(token)).toBeTrue();
    });

    it('returns true for an expired token', () => {
      const pastExp = Math.floor((Date.now() - 10000) / 1000);
      const token = createTestJwt({ sub: 'user', exp: pastExp });
      expect(isJwtExpired(token)).toBeTrue();
    });

    it('returns false for a future-valid token', () => {
      const futureExp = Math.floor((Date.now() + 60000) / 1000);
      const token = createTestJwt({ sub: 'user', exp: futureExp });
      expect(isJwtExpired(token)).toBeFalse();
    });

    it('takes clock skew offset into account', () => {
      // Token expires in 5 seconds
      const expIn5s = Math.floor((Date.now() + 5000) / 1000);
      const token = createTestJwt({ sub: 'user', exp: expIn5s });

      // With 0s offset, still valid
      expect(isJwtExpired(token, 0)).toBeFalse();

      // With 10s offset into future, considered expired
      expect(isJwtExpired(token, 10)).toBeTrue();
    });
  });
});
