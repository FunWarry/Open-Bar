import { hexToHsl, hslToHex } from '../../../app/core/utils/color-utils';

describe('Color Utilities', () => {
  it('should correctly convert HEX to HSL', () => {
    const redHsl = hexToHsl('#FF0000');
    expect(redHsl.h).toBe(0);
    expect(redHsl.s).toBe(100);
    expect(redHsl.l).toBe(50);

    const figmaHsl = hexToHsl('#6C7FE8');
    expect(figmaHsl.h).toBeGreaterThanOrEqual(220);
    expect(figmaHsl.h).toBeLessThanOrEqual(240);
  });

  it('should correctly convert HSL to HEX', () => {
    const redHex = hslToHex(0, 100, 50);
    expect(redHex).toBe('#FF0000');

    const blueHex = hslToHex(240, 100, 50);
    expect(blueHex).toBe('#0000FF');
  });

  it('should handle short 3-character hex codes', () => {
    const hsl = hexToHsl('#F00');
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });
});
