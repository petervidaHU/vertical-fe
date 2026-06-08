/**
 * Color utilities for PixiJS timeline rendering
 */

export function parseColor(value: string, fallback = 0x4ecdc4): number {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      // Convert shorthand #RGB to #RRGGBB
      return parseInt(hex.split("").map((c) => c + c).join(""), 16);
    }
    if (hex.length === 6) {
      return parseInt(hex, 16);
    }
  }

  return fallback;
}

export function colorNumberToRgb(value: number): { r: number; g: number; b: number } {
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

export function rgbToColorNumber(rgb: { r: number; g: number; b: number }): number {
  return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
}

export function mixColorNumbers(a: number, b: number, t: number): number {
  const aRgb = colorNumberToRgb(a);
  const bRgb = colorNumberToRgb(b);
  return rgbToColorNumber({
    r: Math.round(aRgb.r + (bRgb.r - aRgb.r) * t),
    g: Math.round(aRgb.g + (bRgb.g - aRgb.g) * t),
    b: Math.round(aRgb.b + (bRgb.b - aRgb.b) * t),
  });
}
