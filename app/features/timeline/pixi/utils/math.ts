/**
 * Math utilities for PixiJS timeline rendering
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clampNumber(value, 0, 1);
}

export function smoothstep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

export function rotatePoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  angle: number,
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - centerX;
  const dy = y - centerY;
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
}

export function fitDimensionsWithinBox(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const widthRatio = width / maxWidth;
  const heightRatio = height / maxHeight;
  const maxRatio = Math.max(widthRatio, heightRatio);

  if (maxRatio <= 1) {
    return { width, height };
  }

  return {
    width: width / maxRatio,
    height: height / maxRatio,
  };
}
