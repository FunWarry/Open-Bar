import { generateSafeUUID } from '../../../app/core/utils/uuid.util';

describe('generateSafeUUID', () => {
  it('should generate a valid UUID string', () => {
    const uuid = generateSafeUUID();
    expect(uuid).toBeDefined();
    expect(typeof uuid).toBe('string');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate distinct UUIDs on subsequent calls', () => {
    const id1 = generateSafeUUID();
    const id2 = generateSafeUUID();
    expect(id1).not.toEqual(id2);
  });

  it('should fallback gracefully when crypto.randomUUID is not available', () => {
    const originalRandomUUID = crypto.randomUUID;
    try {
      (crypto as unknown as { randomUUID?: unknown }).randomUUID = undefined;
      const uuid = generateSafeUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      (crypto as unknown as { randomUUID?: unknown }).randomUUID = originalRandomUUID;
    }
  });

  it('should fallback to timestamp entropy when both randomUUID and getRandomValues are unavailable', () => {
    const originalRandomUUID = crypto.randomUUID;
    const originalGetRandomValues = crypto.getRandomValues;
    try {
      (crypto as unknown as { randomUUID?: unknown; getRandomValues?: unknown }).randomUUID = undefined;
      (crypto as unknown as { randomUUID?: unknown; getRandomValues?: unknown }).getRandomValues = undefined;
      const uuid = generateSafeUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      (crypto as unknown as { randomUUID?: unknown; getRandomValues?: unknown }).randomUUID = originalRandomUUID;
      (crypto as unknown as { randomUUID?: unknown; getRandomValues?: unknown }).getRandomValues = originalGetRandomValues;
    }
  });
});

