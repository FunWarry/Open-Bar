/**
 * Color utility functions for HSL <-> HEX conversions and automatic palette generation.
 */

export interface HSLColor {
  /** Hue in degrees (0-360). */
  h: number;
  /** Saturation percentage (0-100). */
  s: number;
  /** Lightness percentage (0-100). */
  l: number;
}

/**
 * Converts a hex color string (3 or 6 hex digits, with or without leading #) to HSL object.
 */
export function hexToHsl(hex: string): HSLColor {
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const rVal = Number.parseInt(cleanHex.substring(0, 2), 16) / 255;
  const gVal = Number.parseInt(cleanHex.substring(2, 4), 16) / 255;
  const bVal = Number.parseInt(cleanHex.substring(4, 6), 16) / 255;

  const maxVal = Math.max(rVal, gVal, bVal);
  const minVal = Math.min(rVal, gVal, bVal);
  let h = 0;
  let s = 0;
  const l = (maxVal + minVal) / 2;

  if (maxVal !== minVal) {
    const delta = maxVal - minVal;
    s = l > 0.5 ? delta / (2 - maxVal - minVal) : delta / (maxVal + minVal);
    switch (maxVal) {
      case rVal:
        h = (gVal - bVal) / delta + (gVal < bVal ? 6 : 0);
        break;
      case gVal:
        h = (bVal - rVal) / delta + 2;
        break;
      case bVal:
        h = (rVal - gVal) / delta + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Converts HSL components to hex color string (#rrggbb).
 */
export function hslToHex(h: number, s: number, l: number): string {
  const normH = ((h % 360) + 360) % 360;
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const normL = Math.max(0, Math.min(100, l)) / 100;

  const a = normS * Math.min(normL, 1 - normL);
  const calcHex = (n: number) => {
    const k = (n + normH / 30) % 12;
    const color = normL - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    const hexVal = Math.round(color * 255).toString(16);
    return hexVal.length === 1 ? '0' + hexVal : hexVal;
  };

  return `#${calcHex(0)}${calcHex(8)}${calcHex(4)}`.toUpperCase();
}

/**
 * Converts a hex color string (#rrggbb or #rgb) to an RGB triplet string ("r, g, b").
 */
export function hexToRgbString(hex: string): string {
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const r = Number.parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = Number.parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = Number.parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}
