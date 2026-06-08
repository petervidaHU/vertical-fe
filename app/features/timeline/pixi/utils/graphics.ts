/**
 * Graphics drawing utilities for PixiJS timeline rendering
 */

import { Graphics } from "pixi.js";
import { lerp } from "./math";
import { colorNumberToRgb, rgbToColorNumber } from "./color";

export interface GradientStop {
  color: number;
  percentage: number;
}

/**
 * Sample a color from a gradient based on normalized time (0-1)
 */
export function sampleGradientColor(
  stops: GradientStop[],
  t: number,
): number {
  if (stops.length === 0) return 0x4ecdc4;
  if (stops.length === 1) return stops[0].color;

  const target = Math.max(0, Math.min(100, t * 100));
  const sorted = [...stops].sort((a, b) => a.percentage - b.percentage);

  let left = sorted[0];
  let right = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (target >= sorted[i].percentage && target <= sorted[i + 1].percentage) {
      left = sorted[i];
      right = sorted[i + 1];
      break;
    }
  }

  if (right.percentage === left.percentage) {
    return left.color;
  }

  const localT = (target - left.percentage) / (right.percentage - left.percentage);
  const leftRgb = colorNumberToRgb(left.color);
  const rightRgb = colorNumberToRgb(right.color);

  return rgbToColorNumber({
    r: Math.round(lerp(leftRgb.r, rightRgb.r, localT)),
    g: Math.round(lerp(leftRgb.g, rightRgb.g, localT)),
    b: Math.round(lerp(leftRgb.b, rightRgb.b, localT)),
  });
}

export interface CardLiftShadowOptions {
  shellX: number;
  shellWidth: number;
  shellHeight: number;
  imageX: number;
  imageY: number;
  imageSize: number;
  imageRadius: number;
  offsetX: number;
  offsetY: number;
  spread: number;
  softAlpha: number;
  coreAlpha: number;
  hasImage: boolean;
  cardShellRadius?: number;
}

/**
 * Draw a lift shadow for a card node (animated shadow that grows on hover)
 */
export function drawCardLiftShadow(
  graphics: Graphics,
  options: CardLiftShadowOptions,
): void {
  const { cardShellRadius = 12 } = options;
  const spreadInset = options.spread / 2;

  graphics.clear();

  graphics.roundRect(
    options.shellX + options.offsetX - spreadInset,
    options.offsetY - spreadInset,
    options.shellWidth + options.spread,
    options.shellHeight + options.spread,
    cardShellRadius + 3,
  );
  graphics.fill({ color: 0x000000, alpha: options.softAlpha });

  graphics.roundRect(
    options.shellX + options.offsetX,
    options.offsetY,
    options.shellWidth,
    options.shellHeight,
    cardShellRadius + 1,
  );
  graphics.fill({ color: 0x000000, alpha: options.coreAlpha });

  if (!options.hasImage) {
    return;
  }

  graphics.roundRect(
    options.imageX + options.offsetX - spreadInset,
    options.imageY + options.offsetY - spreadInset,
    options.imageSize + options.spread,
    options.imageSize + options.spread,
    options.imageRadius + 3,
  );
  graphics.fill({ color: 0x000000, alpha: Math.min(0.22, options.softAlpha + 0.03) });

  graphics.roundRect(
    options.imageX + options.offsetX,
    options.imageY + options.offsetY,
    options.imageSize,
    options.imageSize,
    options.imageRadius + 1,
  );
  graphics.fill({ color: 0x000000, alpha: Math.min(0.28, options.coreAlpha + 0.03) });
}

export interface GradientRectOptions {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Gradient stops */
  stops: GradientStop[];
  /** Alpha value (default 1) */
  alpha?: number;
  /** Number of slices (default 28) */
  steps?: number;
  /** Offset ratio for animation (default 0) */
  offsetRatio?: number;
  /** Whether gradient is vertical (default false) */
  vertical?: boolean;
}

/**
 * Draw a gradient rectangle using horizontal or vertical slices
 */
export function drawGradientRect(
  graphics: Graphics,
  options: GradientRectOptions,
): void {
  const {
    x,
    y,
    width,
    height,
    stops,
    alpha = 1,
    steps = 28,
    offsetRatio = 0,
    vertical = false,
  } = options;

  const safeSteps = Math.max(2, steps);
  for (let index = 0; index < safeSteps; index += 1) {
    const from = index / safeSteps;
    const sampleAt = (from + offsetRatio) % 1;
    const color = sampleGradientColor(stops, sampleAt);

    if (vertical) {
      const sliceY = y + height * from;
      const sliceHeight = height / safeSteps + 1;
      graphics.rect(x, sliceY, width, sliceHeight);
    } else {
      const sliceX = x + width * from;
      const sliceWidth = width / safeSteps + 1;
      graphics.rect(sliceX, y, sliceWidth, height);
    }
    graphics.fill({ color, alpha });
  }
}
