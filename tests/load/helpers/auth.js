import http from 'k6/http';
import { check } from 'k6';

/**
 * Shared authentication helper for OpenBar k6 performance scenarios.
 */
export const DEFAULT_BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const tokenCache = {};

/**
 * Authenticates a user against OpenBar /api/auth/login and caches the JWT token.
 *
 * @param {string} username Username
 * @param {string} password Password
 * @param {string} [baseUrl] Base URL (defaults to DEFAULT_BASE_URL)
 * @returns {string|null} JWT token if successful, null otherwise
 */
export function authenticateUser(username, password, baseUrl = DEFAULT_BASE_URL) {
  const cacheKey = `${baseUrl}:${username}`;
  if (tokenCache[cacheKey]) {
    return tokenCache[cacheKey];
  }

  const payload = JSON.stringify({
    username,
    password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Auth_Login' },
  };

  const res = http.post(`${baseUrl}/api/auth/login`, payload, params);

  const ok = check(res, {
    'login status is 200': (r) => r?.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r?.body);
        return Boolean(body?.token ?? body?.accessToken);
      } catch (parseError) {
        console.warn('Auth response parse error:', parseError);
        return false;
      }
    },
  });

  if (ok) {
    const data = JSON.parse(res?.body);
    const token = data?.token ?? data?.accessToken;
    tokenCache[cacheKey] = token;
    return token;
  }

  return null;
}

/**
 * Returns HTTP headers containing the Bearer token for the given user.
 *
 * @param {string} username Username
 * @param {string} password Password
 * @param {string} [baseUrl] Base URL
 * @returns {object} Headers map
 */
export function getAuthHeaders(username, password, baseUrl = DEFAULT_BASE_URL) {
  const token = authenticateUser(username, password, baseUrl);
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}
