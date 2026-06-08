/**
 * Text utilities for PixiJS timeline rendering
 */

import { Text } from "pixi.js";

export function formatAltitude(altitude: number): string {
  return Math.round(altitude).toLocaleString();
}

export function getStoryInitials(value: string): string {
  return value
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, Math.max(1, maxLength - 1)) + "…";
}

export function fitTextToHeight(
  textNode: Text,
  value: string,
  maxHeight: number,
  minLength = 12,
): string {
  let current = value;
  let truncated = truncateText(current, minLength);

  while (truncated !== current) {
    textNode.text = truncated;
    if (textNode.height <= maxHeight) {
      return truncated;
    }
    current = truncated;
    truncated = truncateText(current, current.length - 1);
  }

  textNode.text = truncated;
  return truncated;
}

export function fitTextToWidth(
  textNode: Text,
  value: string,
  maxWidth: number,
  minLength = 12,
): string {
  let current = value;
  let truncated = truncateText(current, minLength);

  while (truncated !== current) {
    textNode.text = truncated;
    if (textNode.width <= maxWidth) {
      return truncated;
    }
    current = truncated;
    truncated = truncateText(current, current.length - 1);
  }

  textNode.text = truncated;
  return truncated;
}
