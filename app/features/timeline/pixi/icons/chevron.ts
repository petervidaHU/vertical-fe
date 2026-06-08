/**
 * Reusable icon library for PixiJS
 * Chevron icon with support for rotation, hover state, and glow effects
 */

import { Graphics } from "pixi.js";
import { lerp, clamp01, rotatePoint } from "../utils/math";

export interface ChevronIconOptions {
  /** X position of the icon bounding box */
  x: number;
  /** Y position of the icon bounding box */
  y: number;
  /** Size of the icon (width/height) */
  size: number;
  /** Rotation progress across the selected axis */
  progress: number;
  /** Stroke color (hex number) */
  color: number;
  /** Stroke alpha (0-1) */
  alpha: number;
  /** Whether the icon is hovered - shows glow and brighter color */
  hovered?: boolean;
  /** Glow color when hovered (defaults to accent color) */
  glowColor?: number;
  /** Orientation: "vertical" for accordion motion, "horizontal" for left/right arrows */
  direction?: "vertical" | "horizontal";
}

/**
 * Draw a chevron (arrow) icon
 * Supports rotation animation, hover effects, and both vertical and horizontal orientation
 */
export function drawChevronIcon(graphics: Graphics, options: ChevronIconOptions): void {
  graphics.clear();

  const {
    x,
    y,
    size,
    progress,
    color,
    alpha,
    hovered = false,
    glowColor = 0xa89968,
    direction = "vertical",
  } = options;

  const lineWidth = Math.max(1.6, Math.min(2.5, size * 0.11));
  const centerX = x + size / 2;
  const centerY = y + size / 2;

  // Use the story-card chevron geometry as the shared base shape, then rotate it.
  const basePoints = [
    { x: x + size * 0.25, y: y + size * 0.4 },
    { x: x + size * 0.5, y: y + size * 0.65 },
    { x: x + size * 0.75, y: y + size * 0.4 },
  ];

  // Apply rotation based on progress
  const angle = direction === "horizontal"
    ? lerp(Math.PI / 2, -Math.PI / 2, clamp01(progress))
    : lerp(0, -Math.PI / 2, clamp01(progress));

  const points = basePoints.map((point) =>
    rotatePoint(point.x, point.y, centerX, centerY, angle),
  );

  // Draw glow effect when hovered
  if (hovered) {
    const glowRadius = size * 0.55;
    graphics.circle(centerX, centerY, glowRadius);
    graphics.fill({ color: glowColor, alpha: 0.12 });
  }

  // Draw chevron stroke
  graphics.moveTo(points[0].x, points[0].y);
  graphics.lineTo(points[1].x, points[1].y);
  graphics.lineTo(points[2].x, points[2].y);
  graphics.stroke({
    color: hovered ? glowColor : color,
    width: lineWidth,
    alpha: hovered ? 0.9 : alpha,
    cap: "round",
    join: "round",
  });
}

/**
 * Create a new chevron icon Graphics object
 */
export function createChevronIcon(options: ChevronIconOptions): Graphics {
  const graphics = new Graphics();
  drawChevronIcon(graphics, options);
  return graphics;
}
