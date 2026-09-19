/**
 * Utility functions for client-side JWT inspection and expiration validation.
 */

/**
 * Decodes the JSON payload portion of a JWT token string.
 *
 * @param token - Raw JWT token string.
 * @returns Decoded JSON payload object, or {@code null} if token is missing or malformed.
 */
export function decodeJwtPayload(token: string | null | undefined): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') {
    return null;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    // Normalize URL-safe Base64 to standard Base64
    let base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT token string is structurally expired.
 *
 * @param token - Raw JWT token string.
 * @param offsetSeconds - Optional clock skew offset in seconds (default 0).
 * @returns True if the token is expired, missing, or malformed; false if still valid.
 */
export function isJwtExpired(token: string | null | undefined, offsetSeconds = 0): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') {
    return true;
  }
  const expiryMs = payload['exp'] * 1000;
  const nowMs = Date.now() + offsetSeconds * 1000;
  return nowMs >= expiryMs;
}
