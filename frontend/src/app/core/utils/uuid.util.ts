/**
 * Generates a RFC 4122 / v4 compliant UUID with safe fallbacks across browser and server contexts.
 * Prevents "TypeError: crypto.randomUUID is not a function" in non-secure
 * LAN / HTTP environments or older mobile browser runtimes.
 *
 * @returns A standard v4 UUID string
 */
export function generateSafeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // Timestamp-derived entropy fallback
    const now = Date.now();
    for (let i = 0; i < 16; i++) {
      bytes[i] = (now >>> (i * 2)) & 0xff;
    }
  }

  // RFC 4122 version 4 (0100) and variant 1 (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
