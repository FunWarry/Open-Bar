import { sanitizePlainText, sanitizeHtml } from '../../../../src/app/core/utils/sanitizer.util';

describe('SanitizerUtil', () => {
  describe('sanitizePlainText', () => {
    it('should return empty string when input is null or undefined', () => {
      expect(sanitizePlainText(null)).toBe('');
      expect(sanitizePlainText(undefined)).toBe('');
      expect(sanitizePlainText('')).toBe('');
    });

    it('should strip script tags and their inner script code', () => {
      const input = '<script>alert("xss")</script>Mojito';
      expect(sanitizePlainText(input)).toBe('Mojito');
    });

    it('should strip script tags with trailing attributes or whitespace in closing tag', () => {
      const input = '<script>alert("xss")</script attr="val">Mojito';
      expect(sanitizePlainText(input)).toBe('Mojito');
    });

    it('should strip img tags with onerror handlers', () => {
      const input = '<img src="invalid" onerror="alert(1)">Old Fashioned';
      expect(sanitizePlainText(input)).toBe('Old Fashioned');
    });

    it('should strip iframe and embed elements', () => {
      const input = '<iframe src="https://evil.com"></iframe>Daiquiri';
      expect(sanitizePlainText(input)).toBe('Daiquiri');
    });

    it('should strip javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Order now</a>';
      expect(sanitizePlainText(input)).toBe('Order now');
    });

    it('should preserve safe plain text and special characters', () => {
      expect(sanitizePlainText('Gin & Tonic')).toBe('Gin & Tonic');
      expect(sanitizePlainText('Table 12 (Terrasse)')).toBe('Table 12 (Terrasse)');
      expect(sanitizePlainText('100% Organic')).toBe('100% Organic');
    });
  });

  describe('sanitizeHtml', () => {
    it('should return empty string for null and undefined', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('should remove executable script tags while keeping clean markup', () => {
      const input = '<script>evil()</script><p>Description</p>';
      expect(sanitizeHtml(input)).toBe('<p>Description</p>');
    });

    it('should remove inline event handlers', () => {
      const input = '<button onclick="exploit()">Click</button>';
      expect(sanitizeHtml(input)).toBe('<button>Click</button>');
    });
  });
});
