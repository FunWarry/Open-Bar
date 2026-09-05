import { SanitizePipe } from '../../../../src/app/core/pipes/sanitize.pipe';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;

  beforeEach(() => {
    pipe = new SanitizePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform null or undefined into an empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('should strip script tags from text interpolation', () => {
    const raw = '<script>alert("hack")</script>Table VIP';
    expect(pipe.transform(raw)).toBe('Table VIP');
  });

  it('should strip malicious event handlers and img tags', () => {
    const raw = '<img src=x onerror=alert(1)>Cosmopolitan';
    expect(pipe.transform(raw)).toBe('Cosmopolitan');
  });

  it('should preserve safe text content', () => {
    const safeText = 'Margarita (Lime & Salt)';
    expect(pipe.transform(safeText)).toBe('Margarita (Lime & Salt)');
  });
});
