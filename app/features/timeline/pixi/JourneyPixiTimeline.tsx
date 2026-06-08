import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import { Application, Assets, Container, Graphics, HTMLText, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { timelineLogger } from "./debug/pixi-timeline-logger";
import { BackgroundValue, parseStoredBackground, primaryColorFromBackground } from "../../../shared/domain/background";
import {
  altitudeToScreenY,
  buildEpicBackgroundPlacements,
  type BackgroundPatternConfig,
  type EpicBackgroundPatternPlacement,
} from "./layout/epicBackgroundPattern";
import { buildStableCardColumnAssignments } from "./layout/cardColumns";
import { getCardPresentation, getLinePresentation } from "./layout/storyPresentation";
import { getAdaptiveAltitudeMotorOptions, smoothToward, stepAltitudeMotor } from "./motion/altitudeMotor";
import {
  DEFAULT_SCROLL_MULTIPLIER,
  canDecreaseScrollMultiplier,
  canIncreaseScrollMultiplier,
  formatScrollMultiplierValue,
  stepScrollMultiplier,
} from "../domain/scrollMultiplier";
import { drawChevronIcon } from "./icons/chevron";

type EpicItem = {
  id: string;
  title: string;
  description: string;
  color: string;
  background: string;
  backgroundImage: string | null;
  backgroundPatternConfig: BackgroundPatternConfig | null;
  startPoint: number;
  endPoint: number;
};

type StoryItem = {
  id: string;
  title: string;
  description: string;
  extraContent: string;
  storyType: "CARD" | "LINE";
  background: string;
  imageUrl: string | null;
  lineColor: string;
  lineWidth: number;
  lineLabel: string;
  tooltipText: string;
  tooltipImageUrl: string | null;
  startPoint: number;
  endPoint: number;
};

type JourneyPixiTimelineProps = {
  epics: EpicItem[];
  stories: StoryItem[];
  startGround: string;
  targetAltitudeRef: MutableRefObject<number>;
  scrollMultiplier?: number;
  viewMode?: "full" | "line-only";
  onStoryCardClick?: (story: StoryItem) => void;
  onScrollMultiplierChange?: (nextMultiplier: number) => void;
  onRenderedAltitudeChange?: (altitude: number) => void;
};

const DISPLAY_FONT = "Trebuchet MS";
const BODY_FONT = "Avenir Next, Trebuchet MS, sans-serif";
const SERIF_FONT = "Georgia";
const CARD_WIDTH = 408;
const CARD_HEIGHT = 146;
const CARD_COLLAPSED_WIDTH = 240;
const CARD_COLLAPSED_HEIGHT = 52;
const CARD_COLLAPSED_IMAGE_SIZE = 58;
const CARD_COLLAPSED_IMAGE_RADIUS = 8;
const CARD_CHEVRON_SIZE = 24;
const CARD_CHEVRON_MARGIN = 8;
const CARD_COLLAPSED_SIDE_PADDING = 6;
const CARD_COLLAPSE_HALF_LIFE_MS = 110;
const CARD_STACK_GAP = 20;
const CARD_COLUMN_GAP = 24;
const CARD_SIDE_PADDING = 16;
const CARD_SHELL_X = 28;
const CARD_SHELL_RADIUS = 12;
const CARD_IMAGE_SIZE = 118;
const CARD_IMAGE_RADIUS = 10;
const CARD_IMAGE_X = 0;
const CARD_IMAGE_Y = 14;
const CARD_CONTENT_X_WITH_IMAGE = 142;
const CARD_CONTENT_X_NO_IMAGE = 22;
const CARD_CONTENT_WIDTH_WITH_IMAGE = CARD_WIDTH - CARD_CONTENT_X_WITH_IMAGE - 24;
const CARD_CONTENT_WIDTH_NO_IMAGE = CARD_WIDTH - CARD_CONTENT_X_NO_IMAGE - 22;
const CARD_SCALE_MIN = 0.8;
const CARD_PADDING_TOP = 14;
const CARD_PADDING_BOTTOM = 12;
const EPIC_HEADER_WIDTH = 236;
const EPIC_HEADER_HEIGHT = 86;
const EPIC_PANEL_WIDTH = 420;
const EPIC_PANEL_PADDING = 24;
const EPIC_PANEL_ANIMATION_HALF_LIFE_MS = 180;
const HUD_TOP_PADDING = 18;
const TOOLTIP_IMAGE_MAX_WIDTH = 220;
const TOOLTIP_IMAGE_MAX_HEIGHT = 110;

type CardLayoutState = {
  x: number;
  y: number;
};

type CardStackLayout = {
  x: number;
  y: number;
};

type CardCollapseState = {
  current: number;
  target: number;
};

type CardFrameMetrics = {
  progress: number;
  width: number;
  height: number;
  shellX: number;
  shellWidth: number;
  shellHeight: number;
  imageX: number;
  imageY: number;
  imageSize: number;
  imageRadius: number;
  chevronX: number;
  chevronY: number;
  collapsedTitleX: number;
  collapsedTitleWidth: number;
};

function parseColor(value: string, fallback = 0x4ecdc4): number {
  if (!value) return fallback;
  const hex = value.startsWith("#") ? value.slice(1) : value;
  const parsed = Number.parseInt(hex, 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function formatAltitude(altitude: number): string {
  if (altitude < 1000) return `${Math.round(altitude)} m`;
  return `${(altitude / 1000).toFixed(1)} km`;
}

function colorNumberToRgb(value: number): { r: number; g: number; b: number } {
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function rgbToColorNumber(rgb: { r: number; g: number; b: number }): number {
  return ((rgb.r & 0xff) << 16) + ((rgb.g & 0xff) << 8) + (rgb.b & 0xff);
}

function mixColorNumbers(a: number, b: number, t: number): number {
  const clampedT = clamp01(t);
  const aRgb = colorNumberToRgb(a);
  const bRgb = colorNumberToRgb(b);

  return rgbToColorNumber({
    r: lerp(aRgb.r, bRgb.r, clampedT),
    g: lerp(aRgb.g, bRgb.g, clampedT),
    b: lerp(aRgb.b, bRgb.b, clampedT),
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fitDimensionsWithinBox(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const safeWidth = Math.max(1, sourceWidth);
  const safeHeight = Math.max(1, sourceHeight);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);

  return {
    width: Math.max(1, safeWidth * scale),
    height: Math.max(1, safeHeight * scale),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getStoryInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function fitTextToHeight(textNode: Text, value: string, maxHeight: number, minLength = 12): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || maxHeight <= 0) {
    textNode.text = "";
    return "";
  }

  textNode.text = normalized;
  if (textNode.height <= maxHeight) {
    return normalized;
  }

  const words = normalized.split(" ").filter(Boolean);
  for (let index = words.length - 1; index > 0; index -= 1) {
    const candidate = `${words.slice(0, index).join(" ").trimEnd()}…`;
    textNode.text = candidate;
    if (textNode.height <= maxHeight) {
      return candidate;
    }
  }

  let shortened = normalized;
  while (shortened.length > Math.max(1, minLength)) {
    shortened = shortened.slice(0, -1).trimEnd();
    const candidate = `${shortened}…`;
    textNode.text = candidate;
    if (textNode.height <= maxHeight) {
      return candidate;
    }
  }

  const fallback = truncateText(normalized, Math.max(1, minLength));
  textNode.text = fallback;
  return fallback;
}

function fitTextToWidth(textNode: Text, value: string, maxWidth: number, minLength = 12): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || maxWidth <= 0) {
    textNode.text = "";
    return "";
  }

  textNode.text = normalized;
  if (textNode.width <= maxWidth) {
    return normalized;
  }

  const words = normalized.split(" ").filter(Boolean);
  for (let index = words.length - 1; index > 0; index -= 1) {
    const candidate = `${words.slice(0, index).join(" ").trimEnd()}…`;
    textNode.text = candidate;
    if (textNode.width <= maxWidth) {
      return candidate;
    }
  }

  let shortened = normalized;
  while (shortened.length > Math.max(1, minLength)) {
    shortened = shortened.slice(0, -1).trimEnd();
    const candidate = `${shortened}…`;
    textNode.text = candidate;
    if (textNode.width <= maxWidth) {
      return candidate;
    }
  }

  const fallback = truncateText(normalized, Math.max(1, minLength));
  textNode.text = fallback;
  return fallback;
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function rotatePoint(x: number, y: number, centerX: number, centerY: number, angle: number): { x: number; y: number } {
  const dx = x - centerX;
  const dy = y - centerY;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  return {
    x: centerX + dx * cosAngle - dy * sinAngle,
    y: centerY + dx * sinAngle + dy * cosAngle,
  };
}

function getCardFrameMetrics(collapseProgress: number, hasStoryImage: boolean): CardFrameMetrics {
  const progress = smoothstep(collapseProgress);
  const width = lerp(CARD_WIDTH, CARD_COLLAPSED_WIDTH, progress);
  const height = lerp(CARD_HEIGHT, CARD_COLLAPSED_HEIGHT, progress);
  const shellX = hasStoryImage ? lerp(CARD_SHELL_X, 0, progress) : 0;
  const expandedShellWidth = hasStoryImage ? CARD_WIDTH - CARD_SHELL_X : CARD_WIDTH;
  const shellWidth = lerp(expandedShellWidth, width, progress);
  const imageSize = hasStoryImage ? lerp(CARD_IMAGE_SIZE, CARD_COLLAPSED_IMAGE_SIZE, progress) : 0;
  const imageRadius = lerp(CARD_IMAGE_RADIUS, CARD_COLLAPSED_IMAGE_RADIUS, progress);
  // Image positioned at left edge to overflow like expanded state, positioned to overflow top and bottom
  const imageX = hasStoryImage ? lerp(CARD_IMAGE_X, -8, progress) : 0;
  const imageY = hasStoryImage ? lerp(CARD_IMAGE_Y, -4, progress) : 0;
  const chevronX = width - CARD_CHEVRON_SIZE - CARD_CHEVRON_MARGIN;
  const chevronY = lerp(CARD_CHEVRON_MARGIN, CARD_COLLAPSED_SIDE_PADDING, progress);
  // Position title after image area to avoid overlap (image is 58px wide at -8 position, so visible 0-50, start title after)
  const collapsedTitleX = hasStoryImage ? 54 : CARD_COLLAPSED_SIDE_PADDING;
  const collapsedTitleWidth = Math.max(30, chevronX - collapsedTitleX - 4);

  return {
    progress,
    width,
    height,
    shellX,
    shellWidth,
    shellHeight: height,
    imageX,
    imageY,
    imageSize,
    imageRadius,
    chevronX,
    chevronY,
    collapsedTitleX,
    collapsedTitleWidth,
  };
}

function drawCardLiftShadow(
  graphics: Graphics,
  options: {
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
  },
) {
  const spreadInset = options.spread / 2;

  graphics.clear();

  graphics.roundRect(
    options.shellX + options.offsetX - spreadInset,
    options.offsetY - spreadInset,
    options.shellWidth + options.spread,
    options.shellHeight + options.spread,
    CARD_SHELL_RADIUS + 3,
  );
  graphics.fill({ color: 0x000000, alpha: options.softAlpha });

  graphics.roundRect(
    options.shellX + options.offsetX,
    options.offsetY,
    options.shellWidth,
    options.shellHeight,
    CARD_SHELL_RADIUS + 1,
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

function summarizeEpicTitles(epics: EpicItem[]): string {
  if (epics.length === 0) {
    return "Open sky";
  }

  return truncateText(epics.slice(0, 2).map((epic) => epic.title).join(" / "), 44);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCardScale(rendererWidth: number, leftInset: number, rightInset: number): number {
  const availableWidth = Math.max(260, rendererWidth - leftInset - rightInset - CARD_SIDE_PADDING * 2);
  return clampNumber(availableWidth / CARD_WIDTH, CARD_SCALE_MIN, 1);
}

function resolveStackedCardColumnYs(
  items: Array<{ preferredY: number; height: number }>,
  minY: number,
  maxY: number,
  stackGap: number,
): number[] {
  if (items.length === 0) {
    return [];
  }

  const maxTopY = Math.max(minY, maxY);
  const positions: number[] = [];
  let lastBottom = minY - stackGap;

  items.forEach(({ preferredY, height }) => {
    const clampedPreferredY = Math.max(minY, Math.min(maxTopY, preferredY));
    const nextY = Math.max(clampedPreferredY, lastBottom + stackGap);

    positions.push(nextY);
    lastBottom = nextY + height;
  });

  const overflow = positions[positions.length - 1] - maxTopY;

  if (overflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= overflow;
    }
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(
      positions[index],
      positions[index + 1] - items[index].height - stackGap,
    );
  }

  const underflow = minY - positions[0];
  if (underflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] += underflow;
    }
  }

  return positions.map((value) => Math.max(minY, Math.min(maxTopY, value)));
}

function buildCardStackLayouts(
  items: Array<{ id: string; preferredY: number; height?: number }>,
  rendererWidth: number,
  topDockY: number,
  bottomDockY: number,
  options?: {
    cardWidth?: number;
    cardHeight?: number;
    stackGap?: number;
    columnGap?: number;
    leftInset?: number;
    rightInset?: number;
    columnAssignments?: Map<string, number>;
  },
): Map<string, CardStackLayout> {
  const layouts = new Map<string, CardStackLayout>();

  const cardWidth = options?.cardWidth ?? CARD_WIDTH;
  const cardHeight = options?.cardHeight ?? CARD_HEIGHT;
  const stackGap = options?.stackGap ?? CARD_STACK_GAP;
  const columnGap = options?.columnGap ?? CARD_COLUMN_GAP;
  const leftInset = options?.leftInset ?? CARD_SIDE_PADDING;
  const rightInset = options?.rightInset ?? CARD_SIDE_PADDING;
  const columnAssignments = options?.columnAssignments;

  if (items.length === 0) {
    return layouts;
  }

  const availableWidth = Math.max(cardWidth, rendererWidth - leftInset - rightInset);
  const maxColumnsThatFit = Math.max(
    1,
    Math.floor((Math.max(cardWidth, availableWidth) + columnGap) / (cardWidth + columnGap)),
  );
  const normalizedItems = [...items]
    .map((item) => ({
      ...item,
      height: item.height ?? cardHeight,
    }))
    .sort((a, b) => a.preferredY - b.preferredY);

  if (columnAssignments && columnAssignments.size > 0) {
    const columnItemsByIndex = new Map<number, Array<{ id: string; preferredY: number; height: number }>>();

    normalizedItems.forEach((item) => {
      const columnIndex = columnAssignments.get(item.id) ?? 0;
      const columnItems = columnItemsByIndex.get(columnIndex);

      if (columnItems) {
        columnItems.push(item);
        return;
      }

      columnItemsByIndex.set(columnIndex, [item]);
    });

    [...columnItemsByIndex.entries()]
      .sort(([leftColumnIndex], [rightColumnIndex]) => leftColumnIndex - rightColumnIndex)
      .forEach(([columnIndex, columnItems]) => {
        const columnYs = resolveStackedCardColumnYs(
          columnItems.map((item) => ({ preferredY: item.preferredY, height: item.height })),
          topDockY,
          bottomDockY,
          stackGap,
        );
        const x = leftInset + columnIndex * (cardWidth + columnGap);

        columnItems.forEach((item, itemIndex) => {
          layouts.set(item.id, {
            x,
            y: columnYs[itemIndex],
          });
        });
      });

    return layouts;
  }

  const columns: Array<{
    items: Array<{ id: string; preferredY: number; height: number }>;
    lastPreferredBottom: number;
  }> = [];

  normalizedItems.forEach((item) => {
    let columnIndex = columns.findIndex((column) => item.preferredY >= column.lastPreferredBottom + stackGap);

    if (columnIndex === -1 && columns.length < maxColumnsThatFit) {
      columns.push({
        items: [],
        lastPreferredBottom: Number.NEGATIVE_INFINITY,
      });
      columnIndex = columns.length - 1;
    }

    if (columnIndex === -1) {
      columnIndex = columns.reduce((bestIndex, column, index, collection) => {
        if (index === 0) {
          return 0;
        }

        return column.lastPreferredBottom < collection[bestIndex].lastPreferredBottom ? index : bestIndex;
      }, 0);
    }

    columns[columnIndex].items.push(item);
    columns[columnIndex].lastPreferredBottom = item.preferredY + item.height;
  });

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const columnItems = columns[columnIndex].items;
    const columnYs = resolveStackedCardColumnYs(
      columnItems.map((item) => ({ preferredY: item.preferredY, height: item.height })),
      topDockY,
      bottomDockY,
      stackGap,
    );
    const x = leftInset + columnIndex * (cardWidth + columnGap);

    columnItems.forEach((item, itemIndex) => {
      layouts.set(item.id, {
        x,
        y: columnYs[itemIndex],
      });
    });
  }

  return layouts;
}

function isLightColor(color: number): boolean {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.67;
}

/** WCAG relative luminance with sRGB gamma correction */
function getRelativeLuminance(color: number): number {
  const sr = ((color >> 16) & 0xff) / 255;
  const sg = ((color >> 8) & 0xff) / 255;
  const sb = (color & 0xff) / 255;
  const r = sr <= 0.03928 ? sr / 12.92 : Math.pow((sr + 0.055) / 1.055, 2.4);
  const g = sg <= 0.03928 ? sg / 12.92 : Math.pow((sg + 0.055) / 1.055, 2.4);
  const b = sb <= 0.03928 ? sb / 12.92 : Math.pow((sb + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors */
function getContrastRatio(colorA: number, colorB: number): number {
  const l1 = getRelativeLuminance(colorA);
  const l2 = getRelativeLuminance(colorB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines if text needs an outline stroke for readability against a background.
 * Only applies stroke if contrast is poor (<1.8:1) to avoid excessive outlines.
 * Reusable for any foreground/background pair.
 */
function pickTextStroke(textColor: number, backgroundColor: number): number | null {
  const contrast = getContrastRatio(textColor, backgroundColor);
  // Only apply stroke for severe contrast issues, not minor ones
  if (contrast >= 1.8) return null;
  
  // Try both black and white, pick whichever gives better contrast
  const blackContrast = getContrastRatio(0x000000, backgroundColor);
  const whiteContrast = getContrastRatio(0xffffff, backgroundColor);
  return blackContrast > whiteContrast ? 0x000000 : 0xffffff;
}

function sampleGradientColor(stops: Array<{ color: number; percentage: number }>, t: number): number {
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
    r: lerp(leftRgb.r, rightRgb.r, localT),
    g: lerp(leftRgb.g, rightRgb.g, localT),
    b: lerp(leftRgb.b, rightRgb.b, localT),
  });
}

function buildPixiStops(background: BackgroundValue, fallbackColor: string): Array<{ color: number; percentage: number }> {
  if (background.mode === "color") {
    const base = parseColor(background.color || fallbackColor);
    return [
      { color: base, percentage: 0 },
      { color: base, percentage: 100 },
    ];
  }

  return background.stops
    .map((stop) => ({
      color: parseColor(stop.color || fallbackColor),
      percentage: Math.max(0, Math.min(100, stop.percentage)),
    }))
    .sort((a, b) => a.percentage - b.percentage);
}

function drawGradientRect(
  graphics: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  stops: Array<{ color: number; percentage: number }>,
  alpha = 1,
  steps = 28,
  offsetRatio = 0,
  vertical = false,
) {
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

type EpicVisual = EpicItem & {
  backgroundPlacements: EpicBackgroundPatternPlacement[];
  stops: Array<{ color: number; percentage: number }>;
  primaryColor: number;
};

type StoryVisual = StoryItem & {
  cardColor: number;
};

function buildEpicPanelHtml(epic: EpicVisual, stories: StoryVisual[]): string {
  const overlappingStories = stories.filter(
    (story) => epic.startPoint <= story.endPoint && epic.endPoint >= story.startPoint,
  );
  const visibleStories = overlappingStories.slice(0, 6);
  const hasAdditionalStories = overlappingStories.length > visibleStories.length;

  const highlightMarkup = visibleStories.length > 0
    ? [
      "<ul>",
      ...visibleStories.map((story) => [
        "<li>",
        `<strong>${escapeHtml(story.title)}</strong>`,
        `<br/>${escapeHtml(story.storyType === "LINE" ? (story.lineLabel || story.description || "Timeline marker") : (story.description || "Canvas story card"))}`,
        `<br/>${escapeHtml(formatAltitude(story.startPoint))} to ${escapeHtml(formatAltitude(story.endPoint))}`,
        "</li>",
      ].join("")),
      "</ul>",
      hasAdditionalStories ? "<p>Additional story moments continue through this altitude band.</p>" : "",
    ].join("")
    : "<p>No stories overlap this epic yet.</p>";

  return [
    '<div style="line-height:1.55;">',
    `<p><strong>${escapeHtml(epic.title)}</strong></p>`,
    `<p><strong>Altitude band</strong><br/>${escapeHtml(formatAltitude(epic.startPoint))} to ${escapeHtml(formatAltitude(epic.endPoint))}</p>`,
    epic.description ? `<p>${escapeHtml(epic.description)}</p>` : "",
    "<p><strong>Highlights</strong></p>",
    highlightMarkup,
    "</div>",
  ].filter(Boolean).join("");
}

type EpicBackgroundNode = {
  container: Container;
  spriteNodes: Array<{
    placement: EpicBackgroundPatternPlacement;
    sprite: Sprite;
  }>;
};

function getEpicProgressAtAltitude(altitude: number, epic: EpicItem): number {
  const span = Math.max(1, epic.endPoint - epic.startPoint);
  const raw = (altitude - epic.startPoint) / span;
  return Math.max(0, Math.min(1, raw));
}

function findEpicAtAltitude(altitude: number, epics: EpicVisual[]): EpicVisual | undefined {
  return epics.find((epic) => altitude >= epic.startPoint && altitude <= epic.endPoint);
}

export default function JourneyPixiTimeline({
  epics,
  stories,
  startGround,
  targetAltitudeRef,
  scrollMultiplier = DEFAULT_SCROLL_MULTIPLIER,
  viewMode = "full",
  onStoryCardClick,
  onScrollMultiplierChange,
  onRenderedAltitudeChange,
}: JourneyPixiTimelineProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const renderedAltitudeRef = useRef(targetAltitudeRef.current);
  const reportedAltitudeRef = useRef(Math.round(targetAltitudeRef.current));
  const scrollMultiplierRef = useRef(scrollMultiplier);
  const onScrollMultiplierChangeRef = useRef(onScrollMultiplierChange);
  const epicAccordionOpenRef = useRef(false);
  const epicAccordionProgressRef = useRef(0);

  useEffect(() => {
    scrollMultiplierRef.current = scrollMultiplier;
  }, [scrollMultiplier]);

  useEffect(() => {
    onScrollMultiplierChangeRef.current = onScrollMultiplierChange;
  }, [onScrollMultiplierChange]);

  const totalDistance = useMemo(() => {
    const storyMax = stories.reduce((max, item) => Math.max(max, item.endPoint), 0);
    const epicMax = epics.reduce((max, item) => Math.max(max, item.endPoint), 0);
    return Math.max(storyMax, epicMax);
  }, [epics, stories]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let initialized = false;

    renderedAltitudeRef.current = Math.max(0, Math.min(totalDistance, targetAltitudeRef.current));
    reportedAltitudeRef.current = Math.round(renderedAltitudeRef.current);

    const app = new Application();
    appRef.current = app;

    const root = new Container();
    const epicBackgroundLayer = new Container();
    const cardsLayer = new Container();
    const badgeLayer = new Container();
    const hudLayer = new Container();

    root.sortableChildren = true;
    cardsLayer.sortableChildren = true;
    epicBackgroundLayer.zIndex = 0;
    cardsLayer.zIndex = 10;
    hudLayer.zIndex = 20;
    badgeLayer.zIndex = 40;

    root.addChild(cardsLayer);
    root.addChild(badgeLayer);
    root.addChild(hudLayer);

    const background = new Graphics();
    root.addChildAt(background, 0);
    root.addChildAt(epicBackgroundLayer, 1);

    const topInfoContainer = new Container();
    const topInfoShadow = new Graphics();
    const topInfoBackground = new Graphics();
    const topInfoHighlight = new Graphics();
    const topInfoMeta = new Text({
      text: "/ 0 m",
      style: {
        fill: 0x6f7f92,
        fontFamily: BODY_FONT,
        fontSize: 13,
        fontWeight: "700",
      },
    });
    const topInfoValue = new Text({
      text: formatAltitude(0),
      style: {
        fill: 0x20313f,
        fontFamily: DISPLAY_FONT,
        fontSize: 34,
        fontWeight: "700",
      },
    });
    topInfoContainer.addChild(topInfoShadow);
    topInfoContainer.addChild(topInfoBackground);
    topInfoContainer.addChild(topInfoHighlight);
    topInfoContainer.addChild(topInfoMeta);
    topInfoContainer.addChild(topInfoValue);

    const speedControlContainer = new Container();
    const speedBackground = new Graphics();
    const speedValue = new Text({
      text: formatScrollMultiplierValue(scrollMultiplierRef.current),
      style: {
        fill: 0x20313f,
        fontFamily: DISPLAY_FONT,
        fontSize: 18,
        fontWeight: "700",
      },
    });
    const speedDecreaseButton = new Container();
    const speedDecreaseBg = new Graphics();
    const speedDecreaseChevron = new Graphics();
    const speedIncreaseButton = new Container();
    const speedIncreaseBg = new Graphics();
    const speedIncreaseChevron = new Graphics();
    speedDecreaseButton.eventMode = "static";
    speedDecreaseButton.cursor = "pointer";
    speedIncreaseButton.eventMode = "static";
    speedIncreaseButton.cursor = "pointer";

    const applyMultiplierChange = (direction: -1 | 1) => {
      const currentValue = scrollMultiplierRef.current;
      const nextValue = stepScrollMultiplier(currentValue, direction);

      if (nextValue !== currentValue) {
        onScrollMultiplierChangeRef.current?.(nextValue);
      }
    };

    speedDecreaseButton.on("pointertap", () => {
      applyMultiplierChange(-1);
    });
    speedIncreaseButton.on("pointertap", () => {
      applyMultiplierChange(1);
    });

    speedDecreaseButton.addChild(speedDecreaseBg);
    speedDecreaseButton.addChild(speedDecreaseChevron);
    speedIncreaseButton.addChild(speedIncreaseBg);
    speedIncreaseButton.addChild(speedIncreaseChevron);

    speedControlContainer.addChild(speedBackground);
    speedControlContainer.addChild(speedValue);
    speedControlContainer.addChild(speedDecreaseButton);
    speedControlContainer.addChild(speedIncreaseButton);

    const distanceRailShell = new Graphics();
    const distanceInteractionArea = new Graphics();
    const distanceTrack = new Graphics();
    const distanceEpicSegments = new Graphics();
    const distanceProgress = new Graphics();
    const distanceMarker = new Graphics();
    const distanceMarkerLabelBg = new Graphics();
    const distanceMarkerLabel = new Text({
      text: formatAltitude(0),
      style: {
        fill: 0x2c3743,
        fontFamily: BODY_FONT,
        fontSize: 12,
        fontWeight: "700",
      },
    });
    const startGroundGraphic = new Graphics();
    const distanceStartLabelBg = new Graphics();
    const distanceStartLabel = new Text({
      text: "0 m",
      style: {
        fill: 0x526173,
        fontFamily: BODY_FONT,
        fontSize: 11,
        fontWeight: "700",
      },
    });
    const distanceEndLabelBg = new Graphics();
    const distanceEndLabel = new Text({
      text: formatAltitude(totalDistance),
      style: {
        fill: 0x526173,
        fontFamily: BODY_FONT,
        fontSize: 11,
        fontWeight: "700",
      },
    });
    distanceMarkerLabel.visible = false;
    distanceMarkerLabelBg.visible = false;
    distanceStartLabel.visible = false;
    distanceStartLabelBg.visible = false;
    distanceEndLabel.visible = false;
    distanceEndLabelBg.visible = false;
    const distanceRailBoundsRef = { current: { top: 0, bottom: 0, height: 0 } };
    const distanceRailDraggingRef = { current: false };

    const syncTargetAltitudeFromDistanceRail = (globalY: number) => {
      const { top, bottom, height } = distanceRailBoundsRef.current;
      if (height <= 0 || totalDistance <= 0) return;

      const clampedY = clampNumber(globalY, top, bottom);
      const nextAltitude = totalDistance * (1 - (clampedY - top) / height);

      targetAltitudeRef.current = clampNumber(nextAltitude, 0, totalDistance);
    };

    distanceInteractionArea.eventMode = "static";
    distanceInteractionArea.cursor = "ns-resize";
    distanceInteractionArea.on("pointertap", (event) => {
      event.stopPropagation();
      syncTargetAltitudeFromDistanceRail(event.global.y);
    });
    distanceInteractionArea.on("pointerdown", (event) => {
      event.stopPropagation();
      distanceRailDraggingRef.current = true;
      syncTargetAltitudeFromDistanceRail(event.global.y);
    });
    distanceInteractionArea.on("pointerup", (event) => {
      event.stopPropagation();
      distanceRailDraggingRef.current = false;
    });
    distanceInteractionArea.on("pointerupoutside", (event) => {
      event.stopPropagation();
      distanceRailDraggingRef.current = false;
    });
    distanceInteractionArea.on("pointercancel", (event) => {
      event.stopPropagation();
      distanceRailDraggingRef.current = false;
    });
    distanceInteractionArea.on("globalpointermove", (event) => {
      if (!distanceRailDraggingRef.current) return;
      event.stopPropagation();
      syncTargetAltitudeFromDistanceRail(event.global.y);
    });

    const epicPanelContainer = new Container();
    const epicPanelShadow = new Graphics();
    const epicPanelBackground = new Graphics();
    const epicPanelContentMask = new Graphics();
    const epicPanelHeaderHitArea = new Graphics();
    const epicPanelContent = new Container();
    const epicPanelTitle = new Text({
      text: "",
      style: {
        fill: 0x1b232c,
        fontFamily: DISPLAY_FONT,
        fontSize: 18,
        fontWeight: "700",
      },
    });
    const epicPanelMeta = new Text({
      text: "",
      style: {
        fill: 0x66788c,
        fontFamily: BODY_FONT,
        fontSize: 12,
        fontWeight: "600",
      },
    });
    const epicPanelChevron = new Graphics();
    const epicPanelBody = new HTMLText({
      text: "",
      style: {
        breakWords: true,
        fill: "#342d28",
        fontFamily: BODY_FONT,
        fontSize: 14,
        lineHeight: 21,
        wordWrap: true,
        wordWrapWidth: EPIC_PANEL_WIDTH - 48,
      },
    });
    epicPanelContainer.zIndex = 10;
    epicPanelHeaderHitArea.eventMode = "static";
    epicPanelHeaderHitArea.cursor = "pointer";
    epicPanelHeaderHitArea.on("pointertap", () => {
      epicAccordionOpenRef.current = !epicAccordionOpenRef.current;
    });
    epicPanelBody.position.set(24, 86);
    epicPanelContent.mask = epicPanelContentMask;
    epicPanelContainer.addChild(epicPanelShadow);
    epicPanelContainer.addChild(epicPanelBackground);
    epicPanelContainer.addChild(epicPanelHeaderHitArea);
    epicPanelContainer.addChild(epicPanelContentMask);
    epicPanelContainer.addChild(epicPanelContent);
    epicPanelContent.addChild(epicPanelTitle);
    epicPanelContent.addChild(epicPanelMeta);
    epicPanelContent.addChild(epicPanelChevron);
    epicPanelContent.addChild(epicPanelBody);

    topInfoContainer.addChild(speedControlContainer);
    hudLayer.addChild(topInfoContainer);
    hudLayer.addChild(distanceInteractionArea);
    hudLayer.addChild(distanceRailShell);
    hudLayer.addChild(distanceTrack);
    hudLayer.addChild(distanceEpicSegments);
    hudLayer.addChild(distanceProgress);
    hudLayer.addChild(distanceMarker);
    hudLayer.addChild(distanceMarkerLabelBg);
    hudLayer.addChild(distanceMarkerLabel);
    hudLayer.addChild(distanceStartLabelBg);
    hudLayer.addChild(distanceStartLabel);
    hudLayer.addChild(distanceEndLabelBg);
    hudLayer.addChild(distanceEndLabel);
    hudLayer.addChild(startGroundGraphic);
    badgeLayer.addChild(epicPanelContainer);

    const epicVisuals: EpicVisual[] = epics.map((epic) => {
      const parsedBackground = parseStoredBackground(epic.background, epic.color);
      return {
        ...epic,
        backgroundPlacements: buildEpicBackgroundPlacements(epic),
        stops: buildPixiStops(parsedBackground, epic.color),
        primaryColor: parseColor(primaryColorFromBackground(parsedBackground)),
      };
    });

    const epicBackgroundNodes: EpicBackgroundNode[] = [];

    const epicVisualById = new Map(epicVisuals.map((epic) => [epic.id, epic]));

    const storyVisuals: StoryVisual[] = stories.map((story) => {
      const parsed = parseStoredBackground(story.background, "#ffd8a8");
      return {
        ...story,
        cardColor: parseColor(primaryColorFromBackground(parsed), 0xffd8a8),
      };
    });

    const tooltipContainer = new Container();
    tooltipContainer.visible = false;
    const tooltipBg = new Graphics();
    const tooltipImageFrame = new Graphics();
    const tooltipTitle = new Text({
      text: "",
      style: {
        breakWords: true,
        fill: 0x2b2b29,
        fontFamily: DISPLAY_FONT,
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 15,
        wordWrap: true,
        wordWrapWidth: 240,
      },
    });
    const tooltipBody = new Text({
      text: "",
      style: {
        breakWords: true,
        fill: 0x5e5347,
        fontFamily: BODY_FONT,
        fontSize: 11,
        lineHeight: 14,
        wordWrap: true,
        wordWrapWidth: 240,
      },
    });
    tooltipTitle.position.set(10, 8);
    tooltipBody.position.set(10, 26);
    tooltipContainer.addChild(tooltipBg);
    tooltipContainer.addChild(tooltipImageFrame);
    tooltipContainer.addChild(tooltipTitle);
    tooltipContainer.addChild(tooltipBody);
    hudLayer.addChild(tooltipContainer);
    let tooltipImageSprite: Sprite | null = null;
    const tooltipImageUrlRef = { current: "" };

    const hoveredLineIdRef = { current: "" };
    const pointerPosRef = { current: { x: 0, y: 0 } };

    const cardCollapseStates = new Map<string, CardCollapseState>();
    const getCardCollapseState = (storyId: string): CardCollapseState => {
      const existingState = cardCollapseStates.get(storyId);
      if (existingState) {
        return existingState;
      }

      const nextState: CardCollapseState = { current: 0, target: 0 };
      cardCollapseStates.set(storyId, nextState);
      return nextState;
    };

    const cardNodes = storyVisuals
      .filter((story) => story.storyType === "CARD")
      .map((story) => {
        const container = new Container();
        container.eventMode = "static";
        container.cursor = "pointer";
        container.hitArea = new Rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT);
        let hovered = false;
        let hoverAmount = 0;
        let chevronHovered = false;
        const hasStoryImage = Boolean(story.imageUrl?.trim());
        const shellX = hasStoryImage ? CARD_SHELL_X : 0;
        const shellWidth = CARD_WIDTH - shellX;
        const contentX = hasStoryImage ? CARD_CONTENT_X_WITH_IMAGE : CARD_CONTENT_X_NO_IMAGE;
        const contentWidth = hasStoryImage ? CARD_CONTENT_WIDTH_WITH_IMAGE : CARD_CONTENT_WIDTH_NO_IMAGE;

        container.on("pointerenter", () => {
          hovered = true;
        });
        container.on("pointerleave", () => {
          hovered = false;
        });
        container.visible = false;
        container.on("pointertap", (event) => {
          // Don't trigger card click if chevron was clicked
          const hitTarget = event.target as any;
          if (hitTarget === chevronHitArea) {
            return;
          }
          onStoryCardClick?.(story);
        });

        // Card shell sits slightly right so the image can break out on the left edge.
        const cardLiftShadow = new Graphics();
        const cardBg = new Graphics();
        cardBg.roundRect(shellX, 0, shellWidth, CARD_HEIGHT, CARD_SHELL_RADIUS);
        cardBg.fill({ color: 0xfafaf8, alpha: 0.95 });
        cardBg.stroke({ color: 0xe0dbd5, width: 1, alpha: 0.6 });

        // Keep a subtle fixed shell shadow; the stronger lift shadow is driven per-frame.
        const cardShadow = new Graphics();
        cardShadow.roundRect(shellX + 6, 10, shellWidth - 4, CARD_HEIGHT - 10, CARD_SHELL_RADIUS + 2);
        cardShadow.fill({ color: 0x000000, alpha: 0.04 });
        cardShadow.roundRect(shellX + 2, 4, shellWidth - 2, CARD_HEIGHT - 6, CARD_SHELL_RADIUS);
        cardShadow.fill({ color: 0x000000, alpha: 0.08 });

        // Chevron icon in top-right
        const chevronGraphic = new Graphics();
        const chevronHitArea = new Graphics();
        chevronHitArea.eventMode = "static";
        chevronHitArea.cursor = "pointer";
        chevronHitArea.rect(CARD_WIDTH - CARD_CHEVRON_SIZE - CARD_CHEVRON_MARGIN, CARD_CHEVRON_MARGIN, CARD_CHEVRON_SIZE, CARD_CHEVRON_SIZE);
        chevronHitArea.fill({ color: 0xffffff, alpha: 0.001 });
        chevronHitArea.on("pointertap", (event) => {
          event.stopPropagation();
          const collapseState = getCardCollapseState(story.id);
          collapseState.target = collapseState.target > 0.5 ? 0 : 1;
        });
        chevronHitArea.on("pointerenter", () => {
          chevronHovered = true;
        });
        chevronHitArea.on("pointerleave", () => {
          chevronHovered = false;
        });

        let imageContainer: Container | null = null;
        let imageBg: Graphics | null = null;
        let imageMask: Graphics | null = null;

        if (hasStoryImage) {
          imageContainer = new Container();
          imageContainer.position.set(CARD_IMAGE_X, CARD_IMAGE_Y);

          imageBg = new Graphics();
          imageBg.roundRect(0, 0, CARD_IMAGE_SIZE, CARD_IMAGE_SIZE, CARD_IMAGE_RADIUS);
          imageBg.fill({ color: 0xf0ebe5, alpha: 0.92 });
          imageBg.stroke({ color: 0xffffff, width: 2, alpha: 0.88 });
          imageContainer.addChild(imageBg);

          imageMask = new Graphics();
          imageMask.roundRect(0, 0, CARD_IMAGE_SIZE, CARD_IMAGE_SIZE, CARD_IMAGE_RADIUS);
          imageMask.fill({ color: 0xffffff });
          imageContainer.addChild(imageMask);
        }

        const titleText = new Text({
          text: story.title,
          style: {
            fill: 0x2c2c28,
            fontFamily: DISPLAY_FONT,
            fontSize: 19,
            fontWeight: "700",
            lineHeight: 22,
            wordWrap: true,
            wordWrapWidth: contentWidth,
          },
        });
        titleText.position.set(contentX, CARD_PADDING_TOP);
        fitTextToHeight(titleText, story.title, 48, 18);

        // Collapsed state title - single line, truncated
        const collapsedTitleText = new Text({
          text: story.title,
          style: {
            fill: 0x2c2c28,
            fontFamily: DISPLAY_FONT,
            fontSize: 14,
            fontWeight: "700",
            lineHeight: 18,
            wordWrap: false,
          },
        });
        collapsedTitleText.position.set(CARD_CHEVRON_MARGIN + CARD_COLLAPSED_IMAGE_SIZE + 12, (CARD_COLLAPSED_HEIGHT - collapsedTitleText.height) / 2);

        const descText = new Text({
          text: story.description || "No description",
          style: {
            fill: 0x6b6560,
            fontFamily: BODY_FONT,
            fontSize: 12,
            lineHeight: 17,
            wordWrap: true,
            wordWrapWidth: contentWidth,
          },
        });

        const altitudeText = new Text({
          text: `${formatAltitude(story.startPoint)} → ${formatAltitude(story.endPoint)}`,
          style: {
            fill: 0x43362c,
            fontFamily: BODY_FONT,
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.2,
          },
        });
        const altitudeY = CARD_HEIGHT - CARD_PADDING_BOTTOM - altitudeText.height - 6;
        altitudeText.position.set(contentX, altitudeY);

        const descY = titleText.y + titleText.height + 8;
        descText.position.set(contentX, descY);
        fitTextToHeight(descText, story.description || "No description", altitudeY - descY - 10, 24);
        descText.visible = descText.text.length > 0;

        container.addChild(cardLiftShadow);
        container.addChild(cardShadow);
        container.addChild(cardBg);
        if (imageContainer) {
          container.addChild(imageContainer);
        }
        container.addChild(titleText);
        container.addChild(descText);
        container.addChild(altitudeText);
        container.addChild(chevronGraphic);
        container.addChild(chevronHitArea);
        container.addChild(collapsedTitleText);

        cardsLayer.addChild(container);

        return {
          cardLiftShadow,
          chevronHitArea,
          imageBg,
          imageMask,
          container,
          imageContainer,
          hasStoryImage,
          shellWidth,
          shellX,
          hovered: () => hovered,
          hoverAmount: () => hoverAmount,
          setHoverAmount: (value: number) => {
            hoverAmount = value;
          },
          chevronHovered: () => chevronHovered,
          story,
          chevronGraphic,
          collapsedTitleText,
          titleText,
          descText,
          altitudeText,
          cardShadow,
          cardBg,
        };
    });

    const lineNodes = storyVisuals
      .filter((story) => story.storyType === "LINE")
      .map((story) => {
        const container = new Container();
        container.zIndex = -20;
        const lineGraphic = new Graphics();
        const hoverArea = new Graphics();
        hoverArea.eventMode = "static";
        hoverArea.cursor = "pointer";

        hoverArea.on("pointerover", () => {
          hoveredLineIdRef.current = story.id;
        });
        hoverArea.on("pointerout", () => {
          if (hoveredLineIdRef.current === story.id) {
            hoveredLineIdRef.current = "";
          }
        });
        hoverArea.on("pointermove", (event) => {
          pointerPosRef.current = { x: event.global.x, y: event.global.y };
          hoveredLineIdRef.current = story.id;
        });
        hoverArea.on("pointertap", () => {
          onStoryCardClick?.(story);
        });

        const textColor = parseColor(story.lineColor, 0x4ecdc4);
        const labelText = new Text({
          text: story.lineLabel || story.title,
          style: {
            fill: textColor,
            fontFamily: "monospace",
            fontSize: 20,
            fontWeight: "700",
          },
        });

        // Pre-calculate contrast with background at story's midpoint altitude
        const storyMidpoint = (story.startPoint + story.endPoint) / 2;
        const containingEpic = epicVisuals.find(
          (epic) => storyMidpoint >= epic.startPoint && storyMidpoint <= epic.endPoint,
        );
        if (containingEpic) {
          const epicProgress = getEpicProgressAtAltitude(storyMidpoint, containingEpic);
          const bgColor = sampleGradientColor(containingEpic.stops, epicProgress);
          const stroke = pickTextStroke(textColor, bgColor);
          if (stroke !== null) {
            labelText.style.stroke = { color: stroke, width: 1.5 };
          }
        }

        container.addChild(lineGraphic);
        container.addChild(hoverArea);
        container.addChild(labelText);
        cardsLayer.addChild(container);

        return {
          container,
          story,
          lineGraphic,
          hoverArea,
          labelText,
        };
      });

    const cardLayoutStates = new Map<string, CardLayoutState>();
    const cardScaleStates = new Map<string, number>(); // Track target scale for eased animation
    const cardImageSprites = new Map<string, Sprite>(); // Track image sprites for each card
    const textures = new Map<string, Texture>();
    let lastEpicPanelHtml = "";
    let lastEpicPanelId = "";

    const renderFrame = (ticker?: { deltaMS?: number }) => {
      const lineOnly = viewMode === "line-only";
      const frameDeltaMs = Math.min(64, Math.max(0, ticker?.deltaMS ?? 16.66));
      const adaptiveAltitudeMotorOptions = getAdaptiveAltitudeMotorOptions({
        current: renderedAltitudeRef.current,
        target: targetAltitudeRef.current,
        deltaMs: frameDeltaMs,
      });
      const currentAltitude = stepAltitudeMotor({
        current: renderedAltitudeRef.current,
        target: targetAltitudeRef.current,
        deltaMs: frameDeltaMs,
        ...adaptiveAltitudeMotorOptions,
        maxAltitude: totalDistance,
      });
      renderedAltitudeRef.current = currentAltitude;
      const roundedAltitude = Math.round(currentAltitude);

      if (roundedAltitude !== reportedAltitudeRef.current) {
        reportedAltitudeRef.current = roundedAltitude;
        onRenderedAltitudeChange?.(roundedAltitude);
      }

      const rendererWidth = app.renderer.width;
      const rendererHeight = app.renderer.height;
      const horizonY = rendererHeight * 0.4;

      const activeEpicForBackground = findEpicAtAltitude(currentAltitude, epicVisuals) ?? epicVisuals[0];

      background.clear();
      if (lineOnly) {
        background.rect(0, 0, rendererWidth, rendererHeight);
        background.fill({ color: 0x08192a, alpha: 0.22 });
      } else {
        background.rect(0, 0, rendererWidth, rendererHeight);
        background.fill({ color: 0x050c15 });

        const backgroundSteps = 100;
        for (let index = 0; index < backgroundSteps; index += 1) {
          const from = index / backgroundSteps;
          const to = (index + 1) / backgroundSteps;
          const y = rendererHeight * from;
          const h = Math.max(1, rendererHeight * (to - from));
          const sampleY = y + h / 2;

          const altitudeAtSlice = currentAltitude + (horizonY - sampleY);
          const epicAtSlice = findEpicAtAltitude(altitudeAtSlice, epicVisuals) ?? activeEpicForBackground;
          const progress = getEpicProgressAtAltitude(altitudeAtSlice, epicAtSlice);
          const color = sampleGradientColor(epicAtSlice.stops, progress);

          background.rect(0, y, rendererWidth, h);
          background.fill({ color, alpha: 0.76 });
        }
      }

      epicBackgroundNodes.forEach(({ container, spriteNodes }) => {
        if (lineOnly) {
          container.visible = false;
          return;
        }

        let visibleSprites = 0;
        const leftPadding = 88;
        const rightPadding = 48;
        const usableWidth = Math.max(120, rendererWidth - leftPadding - rightPadding);

        spriteNodes.forEach(({ placement, sprite }) => {
          const y = altitudeToScreenY(placement.altitude, currentAltitude, horizonY);
          const targetSize = lerp(54, 138, placement.scale);
          const textureMaxDimension = Math.max(sprite.texture.width, sprite.texture.height, 1);
          const spriteScale = targetSize / textureMaxDimension;
          const visibilityPadding = targetSize * 0.9;
          const visible = y >= -visibilityPadding && y <= rendererHeight + visibilityPadding;

          sprite.visible = visible;
          if (!visible) {
            return;
          }

          sprite.position.set(leftPadding + placement.xRatio * usableWidth, y);
          sprite.scale.set(spriteScale);
          sprite.alpha = placement.alpha;
          sprite.rotation = placement.rotation;
          visibleSprites += 1;
        });

        container.visible = visibleSprites > 0;
      });

      const activeEpicColor = activeEpicForBackground?.primaryColor ?? parseColor("#4ecdc4");

      topInfoValue.text = formatAltitude(currentAltitude);
      topInfoMeta.text = `/ ${formatAltitude(totalDistance)}`;

      const speedWidth = Math.max(152, speedValue.width + 96);
      const topInfoWidth = clampNumber(
        Math.max(220, topInfoValue.width + 40, speedWidth + 40),
        220,
        Math.min(320, rendererWidth - 32),
      );
      const topInfoHeight = 112;
      const topInfoX = 16;
      const topInfoY = HUD_TOP_PADDING;

      topInfoContainer.visible = !lineOnly;
      topInfoContainer.position.set(topInfoX, topInfoY);
      topInfoValue.position.set(20, 12);
      topInfoMeta.position.set(22, 52);

      topInfoShadow.clear();
      topInfoShadow.roundRect(8, 10, topInfoWidth, topInfoHeight, 28);
      topInfoShadow.fill({ color: 0x6f5736, alpha: 0.16 });

      topInfoBackground.clear();
      topInfoBackground.roundRect(0, 0, topInfoWidth, topInfoHeight, 28);
      topInfoBackground.fill({ color: 0xf4f9ff, alpha: 0.88 });
      topInfoBackground.stroke({ color: 0xffffff, width: 2, alpha: 0.74 });

      topInfoHighlight.clear();
      topInfoHighlight.roundRect(4, 4, topInfoWidth - 8, 46, 24);
      topInfoHighlight.fill({ color: 0xffffff, alpha: 0.18 });

      const speedHeight = 32;
      const canDecreaseSpeed = canDecreaseScrollMultiplier(scrollMultiplierRef.current);
      const canIncreaseSpeed = canIncreaseScrollMultiplier(scrollMultiplierRef.current);

      speedControlContainer.visible = !lineOnly;
      speedControlContainer.position.set((topInfoWidth - speedWidth) / 2, 72);
      speedValue.text = formatScrollMultiplierValue(scrollMultiplierRef.current);
      speedValue.position.set((speedWidth - speedValue.width) / 2, 4);

      speedBackground.clear();
      speedBackground.roundRect(0, 0, speedWidth, speedHeight, 16);
      speedBackground.fill({ color: 0xebf2f9, alpha: 0.94 });
      speedBackground.stroke({ color: 0xffffff, width: 1.5, alpha: 0.72 });

      speedDecreaseButton.alpha = canDecreaseSpeed ? 1 : 0.45;
      speedDecreaseButton.cursor = canDecreaseSpeed ? "pointer" : "default";
      speedDecreaseButton.position.set(8, 6);
      speedDecreaseBg.clear();
      speedDecreaseBg.circle(10, 10, 10);
      speedDecreaseBg.fill({ color: canDecreaseSpeed ? 0xfbf4e6 : 0xf1f4f7, alpha: 1 });
      speedDecreaseBg.stroke({ color: canDecreaseSpeed ? 0xe8d6ba : 0xd8e1ea, width: 1, alpha: 0.9 });
      drawChevronIcon(speedDecreaseChevron, {
        x: 4,
        y: 4,
        size: 12,
        progress: 0,
        color: canDecreaseSpeed ? 0x34424f : 0x8895a8,
        alpha: 0.9,
        direction: "horizontal",
      });

      speedIncreaseButton.alpha = canIncreaseSpeed ? 1 : 0.45;
      speedIncreaseButton.cursor = canIncreaseSpeed ? "pointer" : "default";
      speedIncreaseButton.position.set(speedWidth - 28, 6);
      speedIncreaseBg.clear();
      speedIncreaseBg.circle(10, 10, 10);
      speedIncreaseBg.fill({ color: canIncreaseSpeed ? 0xfbf4e6 : 0xf1f4f7, alpha: 1 });
      speedIncreaseBg.stroke({ color: canIncreaseSpeed ? 0xe8d6ba : 0xd8e1ea, width: 1, alpha: 0.9 });
      drawChevronIcon(speedIncreaseChevron, {
        x: 4,
        y: 4,
        size: 12,
        progress: 1,
        color: canIncreaseSpeed ? 0x34424f : 0x8895a8,
        alpha: 0.9,
        direction: "horizontal",
      });

      const uiTopBoundary = lineOnly ? 8 : topInfoY + topInfoHeight + 20;
      const epicPanelProgress = smoothToward(
        epicAccordionProgressRef.current,
        epicAccordionOpenRef.current ? 1 : 0,
        EPIC_PANEL_ANIMATION_HALF_LIFE_MS,
        frameDeltaMs,
      );
      epicAccordionProgressRef.current = epicPanelProgress;

      const timelineX = lineOnly ? Math.floor(rendererWidth / 2) - 3 : 34;
      const timelineTop = lineOnly ? 8 : uiTopBoundary + 4;
      const timelineHeight = lineOnly ? Math.max(220, rendererHeight - 16) : Math.max(180, rendererHeight - timelineTop - 64);
      const timelineBottom = timelineTop + timelineHeight;
      const clampedAltitude = totalDistance > 0 ? Math.min(currentAltitude, totalDistance) : 0;
      const progressRatio = totalDistance > 0 ? clampedAltitude / totalDistance : 0;
      const markerY = timelineBottom - progressRatio * timelineHeight;
      const safeTotalDistance = Math.max(totalDistance, 1);

      distanceRailShell.clear();
      distanceRailShell.roundRect(timelineX - 2, timelineTop - 4, 12, timelineHeight + 8, 6);
      distanceRailShell.fill({ color: lineOnly ? 0xa7c0da : 0x5e7b98, alpha: lineOnly ? 0.16 : 0.08 });

      distanceRailBoundsRef.current = {
        top: timelineTop,
        bottom: timelineBottom,
        height: timelineHeight,
      };

      distanceInteractionArea.clear();
      distanceInteractionArea.roundRect(28, timelineTop - 26, 148, timelineHeight + 52, 24);
      distanceInteractionArea.fill({ color: 0xffffff, alpha: 0.001 });

      distanceTrack.clear();
      distanceTrack.roundRect(timelineX, timelineTop, 8, timelineHeight, 4);
      distanceTrack.fill({ color: lineOnly ? 0x9bb9d9 : 0xe8f1f8, alpha: lineOnly ? 0.92 : 0.82 });

      distanceEpicSegments.clear();
      epicVisuals.forEach((epic) => {
        const segmentStart = Math.max(0, Math.min(totalDistance, epic.startPoint));
        const segmentEnd = Math.max(0, Math.min(totalDistance, epic.endPoint));
        if (segmentEnd <= segmentStart) return;

        const segmentTop = timelineBottom - (segmentEnd / safeTotalDistance) * timelineHeight;
        const segmentBottom = timelineBottom - (segmentStart / safeTotalDistance) * timelineHeight;
        const segmentHeight = Math.max(2, segmentBottom - segmentTop);

        distanceEpicSegments.roundRect(timelineX + 2, segmentTop, 4, segmentHeight, 2);
        distanceEpicSegments.fill({
          color: epic.primaryColor,
          alpha: 0.95,
        });
      });

      distanceProgress.clear();
      distanceProgress.roundRect(
        timelineX,
        markerY,
        8,
        Math.max(2, timelineBottom - markerY),
        4,
      );
      distanceProgress.fill({ color: activeEpicColor, alpha: lineOnly ? 0.56 : 0.26 });

      distanceMarker.clear();
      distanceMarker.circle(timelineX + 4, markerY, 7);
      distanceMarker.fill({ color: 0xffffff });
      distanceMarker.stroke({ color: activeEpicColor, width: 2 });

      distanceStartLabel.visible = false;
      distanceEndLabel.visible = false;
      distanceStartLabelBg.visible = false;
      distanceEndLabelBg.visible = false;
      distanceMarkerLabel.visible = false;
      distanceMarkerLabelBg.visible = false;

      distanceStartLabelBg.clear();
      distanceEndLabelBg.clear();
      distanceMarkerLabelBg.clear();

      const parsedGround = parseStoredBackground(startGround, "#4b3726");
      const groundBaseColor = parseColor(primaryColorFromBackground(parsedGround), 0x4b3726);
      const groundDeepColor = mixColorNumbers(groundBaseColor, 0x000000, 0.26);
      const groundTopRimColor = mixColorNumbers(groundBaseColor, 0xffffff, 0.22);
      const groundY = rendererHeight - 42 + currentAltitude;
      const groundCurveHeight = clampNumber(rendererHeight * 0.05, 18, 46);
      const groundBottomY = rendererHeight + 24;

      startGroundGraphic.clear();
      if (!lineOnly && groundY < groundBottomY && groundY > -rendererHeight) {
        // Main ground body: curved top edge and full fill to bottom of screen.
        startGroundGraphic.moveTo(0, groundY);
        startGroundGraphic.bezierCurveTo(
          rendererWidth * 0.25,
          groundY - groundCurveHeight,
          rendererWidth * 0.75,
          groundY - groundCurveHeight,
          rendererWidth,
          groundY,
        );
        startGroundGraphic.lineTo(rendererWidth, groundBottomY);
        startGroundGraphic.lineTo(0, groundBottomY);
        startGroundGraphic.closePath();
        startGroundGraphic.fill({ color: groundBaseColor, alpha: 0.96 });

        // Subtle depth layer to avoid flat look and suggest denser soil lower down.
        startGroundGraphic.moveTo(0, groundY + 14);
        startGroundGraphic.bezierCurveTo(
          rendererWidth * 0.25,
          groundY - groundCurveHeight + 14,
          rendererWidth * 0.75,
          groundY - groundCurveHeight + 14,
          rendererWidth,
          groundY + 14,
        );
        startGroundGraphic.lineTo(rendererWidth, groundBottomY);
        startGroundGraphic.lineTo(0, groundBottomY);
        startGroundGraphic.closePath();
        startGroundGraphic.fill({ color: groundDeepColor, alpha: 0.28 });

        // Highlight ridge where sky meets ground.
        startGroundGraphic.moveTo(0, groundY);
        startGroundGraphic.bezierCurveTo(
          rendererWidth * 0.25,
          groundY - groundCurveHeight,
          rendererWidth * 0.75,
          groundY - groundCurveHeight,
          rendererWidth,
          groundY,
        );
        startGroundGraphic.stroke({ color: groundTopRimColor, width: 2, alpha: 0.82 });
      }

      const epicPanelWidth = Math.min(EPIC_PANEL_WIDTH, Math.max(280, rendererWidth - EPIC_PANEL_PADDING * 2));
      const epicPanelHeight = rendererHeight - EPIC_PANEL_PADDING * 2;
      const epicClosedX = Math.max(EPIC_PANEL_PADDING, rendererWidth - EPIC_PANEL_PADDING - EPIC_HEADER_WIDTH);
      const epicOpenX = Math.max(EPIC_PANEL_PADDING, rendererWidth - EPIC_PANEL_PADDING - epicPanelWidth);
      const reservedRightInset = lineOnly ? 24 : EPIC_HEADER_WIDTH + 28;
      const cardScale = getCardScale(rendererWidth, 72, reservedRightInset);
      const scaledCardWidth = CARD_WIDTH * cardScale;
      const scaledCardHeight = CARD_HEIGHT * cardScale;
      const scaledCollapsedCardHeight = CARD_COLLAPSED_HEIGHT * cardScale;
      const topDockY = uiTopBoundary + 14;
      const bottomDockY = rendererHeight - scaledCardHeight - 110;
      const offscreenDistance = scaledCardHeight + 28;
      const stableCardColumnAssignments = buildStableCardColumnAssignments(
        cardNodes.map(({ story }) => story),
        rendererWidth,
        {
          cardWidth: scaledCardWidth,
          columnGap: CARD_COLUMN_GAP,
          leftInset: 86,
          rightInset: reservedRightInset,
        },
      );
      const cardPresentations = new Map(
        cardNodes.map(({ story }) => [
          story.id,
          getCardPresentation({
            story,
            altitude: currentAltitude,
            topDockY,
            bottomDockY,
            rendererHeight,
            offscreenDistance,
          }),
        ]),
      );
      const cardCollapseProgressById = new Map<string, number>();

      cardNodes.forEach(({ story }) => {
        const collapseState = getCardCollapseState(story.id);
        const nextProgress = smoothToward(
          collapseState.current,
          collapseState.target,
          CARD_COLLAPSE_HALF_LIFE_MS,
          frameDeltaMs,
        );
        collapseState.current = Math.abs(nextProgress - collapseState.target) <= 0.001 ? collapseState.target : nextProgress;
        cardCollapseProgressById.set(story.id, collapseState.current);
      });

      const visibleCardLayouts = buildCardStackLayouts(
        cardNodes
          .map(({ story }) => ({
            id: story.id,
            preferredY: cardPresentations.get(story.id)?.y ?? topDockY,
            height: lerp(
              scaledCardHeight,
              scaledCollapsedCardHeight,
              smoothstep(cardCollapseProgressById.get(story.id) ?? 0),
            ),
          }))
          .filter(({ id }) => cardPresentations.get(id)?.visible),
        rendererWidth,
        topDockY - offscreenDistance,
        bottomDockY + offscreenDistance,
        {
          cardWidth: scaledCardWidth,
          cardHeight: scaledCardHeight,
          leftInset: 86,
          rightInset: reservedRightInset,
          columnAssignments: stableCardColumnAssignments,
        },
      );

      cardNodes.forEach(({ cardLiftShadow, chevronHitArea, imageBg, imageMask, container, hovered, hoverAmount, setHoverAmount, story, imageContainer, hasStoryImage, chevronGraphic, collapsedTitleText, titleText, descText, altitudeText, cardShadow, cardBg, chevronHovered }) => {
        if (lineOnly) {
          cardLayoutStates.delete(story.id);
          container.visible = false;
          return;
        }

        const presentation = cardPresentations.get(story.id);
        const targetLayout = visibleCardLayouts.get(story.id);

        if (!presentation?.visible || !targetLayout) {
          cardLayoutStates.delete(story.id);
          container.visible = false;
          return;
        }

        container.visible = true;
        const currentLayoutState = cardLayoutStates.get(story.id);

        if (!currentLayoutState) {
          cardLayoutStates.set(story.id, {
            x: targetLayout.x,
            y: targetLayout.y,
          });
        } else {
          currentLayoutState.x = smoothToward(currentLayoutState.x, targetLayout.x, 160, frameDeltaMs);
          currentLayoutState.y = smoothToward(currentLayoutState.y, targetLayout.y, 160, frameDeltaMs);
        }

        const layoutState = cardLayoutStates.get(story.id);
        const collapseProgress = cardCollapseProgressById.get(story.id) ?? 0;
        const frameMetrics = getCardFrameMetrics(collapseProgress, hasStoryImage);

        const nextHoverAmount = smoothToward(hoverAmount(), hovered() ? 1 : 0, 0.01, frameDeltaMs);
        setHoverAmount(nextHoverAmount);
        const resolvedX = layoutState?.x ?? targetLayout.x;
        const resolvedY = layoutState?.y ?? targetLayout.y;

        // Eased scale transition on hover
        const targetCardScale = cardScale * (1 + nextHoverAmount * 0.08);
        const currentCardScale = cardScaleStates.get(story.id) ?? cardScale;
        const easedCardScale = smoothToward(currentCardScale, targetCardScale, 120, frameDeltaMs);
        cardScaleStates.set(story.id, easedCardScale);

        const cardCenterY = resolvedY + frameMetrics.height * easedCardScale / 2;
        const centerDistanceRatio = clamp01(Math.abs(cardCenterY - rendererHeight / 2) / Math.max(1, rendererHeight * 0.44));
        const centerLift = 1 - centerDistanceRatio;

        container.hitArea = new Rectangle(0, 0, frameMetrics.width, frameMetrics.height);

        container.position.set(resolvedX, resolvedY);
        container.alpha = clampNumber(presentation.alpha + nextHoverAmount * 0.08, 0, 1);
        container.rotation = presentation.rotation * (1 - nextHoverAmount * 0.72);
        container.zIndex = Math.round(nextHoverAmount * 200);
        container.scale.set(easedCardScale);

        const expandedAlpha = clamp01(1 - frameMetrics.progress * 1.45);
        const collapsedAlpha = clamp01((frameMetrics.progress - 0.16) / 0.84);

        chevronHitArea.clear();
        chevronHitArea.rect(
          frameMetrics.chevronX - 6,
          frameMetrics.chevronY - 6,
          CARD_CHEVRON_SIZE + 12,
          CARD_CHEVRON_SIZE + 12,
        );
        chevronHitArea.fill({ color: 0xffffff, alpha: 0.001 });

        drawChevronIcon(chevronGraphic, {
          x: frameMetrics.chevronX,
          y: frameMetrics.chevronY,
          size: CARD_CHEVRON_SIZE,
          progress: frameMetrics.progress,
          color: 0x8b7d72,
          alpha: 0.7,
          hovered: chevronHovered(),
        });

        titleText.alpha = expandedAlpha;
        descText.alpha = expandedAlpha;
        altitudeText.alpha = expandedAlpha;
        collapsedTitleText.alpha = collapsedAlpha;
        // Fit and truncate title with ellipsis if too long
        const fittedTitle = fitTextToWidth(collapsedTitleText, story.title, frameMetrics.collapsedTitleWidth, 8);
        collapsedTitleText.text = fittedTitle;
        collapsedTitleText.position.set(
          frameMetrics.collapsedTitleX,
          Math.max(CARD_COLLAPSED_SIDE_PADDING, (frameMetrics.height - collapsedTitleText.height) / 2),
        );

        cardBg.clear();
        cardBg.roundRect(frameMetrics.shellX, 0, frameMetrics.shellWidth, frameMetrics.shellHeight, CARD_SHELL_RADIUS);
        cardBg.fill({ color: 0xfafaf8, alpha: 0.95 });
        cardBg.stroke({ color: 0xe0dbd5, width: 1, alpha: 0.6 });

        cardShadow.clear();
        cardShadow.roundRect(
          frameMetrics.shellX + 6,
          10,
          Math.max(0, frameMetrics.shellWidth - 4),
          Math.max(0, frameMetrics.shellHeight - 10),
          CARD_SHELL_RADIUS + 2,
        );
        cardShadow.fill({ color: 0x000000, alpha: 0.04 * expandedAlpha });
        cardShadow.roundRect(
          frameMetrics.shellX + 2,
          4,
          Math.max(0, frameMetrics.shellWidth - 2),
          Math.max(0, frameMetrics.shellHeight - 6),
          CARD_SHELL_RADIUS,
        );
        cardShadow.fill({ color: 0x000000, alpha: 0.08 * expandedAlpha });

        drawCardLiftShadow(cardLiftShadow, {
          shellX: frameMetrics.shellX,
          shellWidth: frameMetrics.shellWidth,
          shellHeight: frameMetrics.shellHeight,
          imageX: frameMetrics.imageX,
          imageY: frameMetrics.imageY,
          imageSize: frameMetrics.imageSize,
          imageRadius: frameMetrics.imageRadius,
          offsetX: 2 + centerLift * 2.5,
          offsetY: 4 + centerLift * 7 + nextHoverAmount * 2,
          spread: 2 + centerLift * 6,
          softAlpha: (0.045 + centerLift * 0.055) * expandedAlpha,
          coreAlpha: (0.055 + centerLift * 0.08) * expandedAlpha,
          hasImage: hasStoryImage,
        });

        if (!hasStoryImage || !imageContainer || !imageBg || !imageMask) {
          const staleSprite = cardImageSprites.get(story.id);
          if (staleSprite) {
            staleSprite.removeFromParent();
            staleSprite.destroy();
            cardImageSprites.delete(story.id);
          }
          return;
        }

        imageContainer.position.set(frameMetrics.imageX, frameMetrics.imageY);
        imageContainer.scale.set(1);
        imageContainer.alpha = 1;

        imageBg.clear();
        imageBg.roundRect(0, 0, frameMetrics.imageSize, frameMetrics.imageSize, frameMetrics.imageRadius);
        imageBg.fill({ color: 0xf0ebe5, alpha: 0.92 });
        imageBg.stroke({ color: 0xffffff, width: 2, alpha: 0.88 });

        imageMask.clear();
        imageMask.roundRect(0, 0, frameMetrics.imageSize, frameMetrics.imageSize, frameMetrics.imageRadius);
        imageMask.fill({ color: 0xffffff });

        const cardImageUrl = story.imageUrl || "";
        const cardImageTexture = cardImageUrl ? textures.get(cardImageUrl) : undefined;
        const hasImage = !!cardImageTexture;

        if (hasImage && cardImageTexture) {
          imageContainer.visible = true;

          // Create or update image sprite
          let imageSprite = cardImageSprites.get(story.id);
          if (!imageSprite) {
            imageSprite = new Sprite(cardImageTexture);
            imageContainer.addChild(imageSprite);
            cardImageSprites.set(story.id, imageSprite);
            // Apply mask to clip image to rounded rect shape
            imageSprite.mask = imageMask;
            timelineLogger.logImageLoad(story.id, cardImageUrl, true);
          } else {
            imageSprite.texture = cardImageTexture;
          }

          const imageDims = fitDimensionsWithinBox(
            cardImageTexture.width,
            cardImageTexture.height,
            frameMetrics.imageSize,
            frameMetrics.imageSize,
          );
          const imageScale = imageDims.width / cardImageTexture.width;
          imageSprite.scale.set(imageScale);
          imageSprite.position.set(
            (frameMetrics.imageSize - imageDims.width) / 2,
            (frameMetrics.imageSize - imageDims.height) / 2,
          );
        } else {
          imageContainer.visible = true;

          // Clean up sprite if image was removed
          const imageSprite = cardImageSprites.get(story.id);
          if (imageSprite) {
            imageContainer.removeChild(imageSprite);
            imageSprite.destroy();
            cardImageSprites.delete(story.id);
            timelineLogger.logImageLoad(story.id, cardImageUrl, false);
          }
        }
      });

      lineNodes.forEach(({ container, story, lineGraphic, hoverArea, labelText }) => {
        if (lineOnly) {
          container.visible = false;
          return;
        }

        const thickness = Math.max(1, Math.min(64, story.lineWidth));
        const linePresentation = getLinePresentation({
          story,
          altitude: currentAltitude,
          topY: 132,
          bottomY: rendererHeight - 132,
          rendererHeight,
          offscreenDistance: Math.max(56, thickness + 18),
        });

        container.visible = linePresentation.visible;
        if (!linePresentation.visible) return;

        const y = linePresentation.y;
        const displayThickness = thickness * 2.4;
        const arcHeight = displayThickness * 1.8;
        const isHovered = hoveredLineIdRef.current === story.id;

        lineGraphic.clear();
        
        // Get base color
        let lineColor = parseColor(story.lineColor, 0x4ecdc4);
        
        // Make color more vivid on hover
        if (isHovered) {
          lineColor = mixColorNumbers(lineColor, 0xffffff, 0.35);
        }
        
        // Top curved edge - smooth arc bulging upward
        lineGraphic.moveTo(0, y);
        lineGraphic.bezierCurveTo(
          rendererWidth * 0.25, y - arcHeight,
          rendererWidth * 0.75, y - arcHeight,
          rendererWidth, y
        );
        
        // Bottom edge - straight line back
        lineGraphic.lineTo(rendererWidth, y + displayThickness);
        lineGraphic.lineTo(0, y + displayThickness);
        lineGraphic.closePath();
        
        lineGraphic.fill({ color: lineColor, alpha: linePresentation.alpha });

        hoverArea.clear();
        const hoverPadding = arcHeight + displayThickness;
        hoverArea.rect(0, y - arcHeight - 8, rendererWidth, hoverPadding + 16);
        hoverArea.fill({ color: 0xffffff, alpha: 0.001 });

        labelText.text = story.lineLabel || story.title;
        labelText.style.fontSize = isHovered ? 26 : 20;
        labelText.style.fontWeight = isHovered ? "700" : "700";
        
        // Center horizontally and position above the line to avoid overlap
        const labelX = rendererWidth / 2 - labelText.width / 2;
        const labelY = y - arcHeight - 28;
        labelText.position.set(labelX, labelY);
        labelText.alpha = linePresentation.alpha * (isHovered ? 1 : 0.9);
      });

      const hoveredLine = lineNodes.find((lineNode) => lineNode.story.id === hoveredLineIdRef.current);
      if (!lineOnly && hoveredLine && hoveredLine.container.visible) {
        const tooltipImageUrl = hoveredLine.story.imageUrl || hoveredLine.story.tooltipImageUrl || "";
        const tooltipTexture = tooltipImageUrl ? textures.get(tooltipImageUrl) : undefined;
        const tooltipImageSize = tooltipTexture
          ? fitDimensionsWithinBox(
            tooltipTexture.width,
            tooltipTexture.height,
            TOOLTIP_IMAGE_MAX_WIDTH,
            TOOLTIP_IMAGE_MAX_HEIGHT,
          )
          : null;
        const body = hoveredLine.story.tooltipText || hoveredLine.story.description || "No tooltip text";

        tooltipTitle.text = hoveredLine.story.lineLabel || hoveredLine.story.title;
        tooltipBody.text = body;
        tooltipBody.position.set(10, 26);

        const imageY = tooltipBody.y + tooltipBody.height + 10;
        const width = Math.max(
          220,
          Math.max(
            tooltipTitle.width,
            tooltipBody.width,
            tooltipImageSize?.width ?? 0,
          ) + 20,
        );
        const height = 18 + tooltipBody.height + (tooltipImageSize ? tooltipImageSize.height + 26 : 18);

        tooltipImageFrame.clear();
        if (tooltipTexture && tooltipImageSize) {
          tooltipImageFrame.roundRect(10, imageY, tooltipImageSize.width, tooltipImageSize.height, 8);
          tooltipImageFrame.fill({ color: 0xfffaf2, alpha: 0.82 });
          tooltipImageFrame.stroke({ color: 0xe3d0b2, width: 1, alpha: 0.8 });

          if (!tooltipImageSprite || tooltipImageUrlRef.current !== tooltipImageUrl) {
            if (tooltipImageSprite) {
              tooltipContainer.removeChild(tooltipImageSprite);
              tooltipImageSprite.destroy();
            }

            tooltipImageSprite = new Sprite(tooltipTexture);
            tooltipContainer.addChild(tooltipImageSprite);
            tooltipImageUrlRef.current = tooltipImageUrl;
          }

          tooltipImageSprite.texture = tooltipTexture;
          tooltipImageSprite.visible = true;
          tooltipImageSprite.position.set(10, imageY);
          tooltipImageSprite.width = tooltipImageSize.width;
          tooltipImageSprite.height = tooltipImageSize.height;
        } else {
          tooltipImageUrlRef.current = "";
          if (tooltipImageSprite) {
            tooltipImageSprite.visible = false;
          }
        }

        tooltipBg.clear();
        tooltipBg.roundRect(0, 0, width, height, 8);
        tooltipBg.fill({ color: 0xfff4e3, alpha: 0.97 });
        tooltipBg.stroke({ color: 0xe2cfb0, width: 1.2 });

        tooltipContainer.position.set(
          Math.min(rendererWidth - width - 8, pointerPosRef.current.x + 14),
          Math.max(8, pointerPosRef.current.y - height - 12),
        );
        tooltipContainer.visible = true;
      } else {
        tooltipImageFrame.clear();
        tooltipImageUrlRef.current = "";
        if (tooltipImageSprite) {
          tooltipImageSprite.visible = false;
        }
        tooltipContainer.visible = false;
      }

      if (lineOnly || !activeEpicForBackground) {
        epicPanelContainer.visible = false;
      } else {
        const epicEasedProgress = smoothstep(epicPanelProgress);
        const epicCurrentWidth = lerp(EPIC_HEADER_WIDTH, epicPanelWidth, epicEasedProgress);
        const epicCurrentHeight = lerp(EPIC_HEADER_HEIGHT, epicPanelHeight, epicEasedProgress);
        const epicPanelX = lerp(epicClosedX, epicOpenX, epicEasedProgress);
        const panelHeaderAlpha = lerp(0.9, 1, epicEasedProgress);
        const epicBodyVisible = epicEasedProgress > 0.42;
        const panelBodyAlpha = clamp01((epicEasedProgress - 0.42) / 0.58);
        const panelBodyOffsetY = lerp(28, 0, panelBodyAlpha);

        epicPanelContainer.visible = true;
        epicPanelContainer.position.set(epicPanelX, EPIC_PANEL_PADDING + lerp(8, 0, epicEasedProgress));
        epicPanelContainer.alpha = 0.86 + epicEasedProgress * 0.14;
        epicPanelContainer.scale.set(lerp(0.97, 1, epicEasedProgress));

        fitTextToWidth(epicPanelTitle, activeEpicForBackground.title, Math.max(120, epicCurrentWidth - 72), 8);
        fitTextToWidth(
          epicPanelMeta,
          `${formatAltitude(activeEpicForBackground.startPoint)} -> ${formatAltitude(activeEpicForBackground.endPoint)}`,
          Math.max(140, epicCurrentWidth - 72),
          10,
        );
        drawChevronIcon(epicPanelChevron, {
          x: 0,
          y: 0,
          size: 20,
          progress: epicEasedProgress,
          color: 0x2a3846,
          alpha: 0.92,
          direction: "vertical",
        });
        epicPanelTitle.alpha = panelHeaderAlpha;
        epicPanelMeta.alpha = panelHeaderAlpha;
        epicPanelChevron.alpha = panelHeaderAlpha;
        epicPanelBody.visible = epicBodyVisible;
        epicPanelBody.alpha = panelBodyAlpha;
        epicPanelBody.position.set(24, 86 + panelBodyOffsetY);

        if (lastEpicPanelId !== activeEpicForBackground.id || lastEpicPanelHtml === "") {
          lastEpicPanelId = activeEpicForBackground.id;
          lastEpicPanelHtml = buildEpicPanelHtml(activeEpicForBackground, storyVisuals);
          epicPanelBody.text = lastEpicPanelHtml;
        }
        epicPanelBody.style.wordWrapWidth = Math.max(220, epicPanelWidth - 48);

        epicPanelShadow.clear();
        epicPanelShadow.roundRect(6, 10, Math.max(0, epicCurrentWidth - 4), Math.max(0, epicCurrentHeight - 10), 30);
        epicPanelShadow.fill({ color: 0x000000, alpha: 0.04 });
        epicPanelShadow.roundRect(2, 4, Math.max(0, epicCurrentWidth - 2), Math.max(0, epicCurrentHeight - 6), 28);
        epicPanelShadow.fill({ color: 0x000000, alpha: 0.08 });

        epicPanelBackground.clear();
        epicPanelBackground.roundRect(0, 0, epicCurrentWidth, epicCurrentHeight, 28);
        epicPanelBackground.fill({ color: 0xfafaf8, alpha: 0.95 });
        epicPanelBackground.stroke({ color: 0xe0dbd5, width: 1, alpha: 0.6 });

        epicPanelContentMask.clear();
        epicPanelContentMask.roundRect(0, 0, epicCurrentWidth, epicCurrentHeight, 28);
        epicPanelContentMask.fill({ color: 0xffffff, alpha: 1 });

        epicPanelHeaderHitArea.clear();
        epicPanelHeaderHitArea.roundRect(0, 0, epicCurrentWidth, Math.min(epicCurrentHeight, EPIC_HEADER_HEIGHT), 26);
        epicPanelHeaderHitArea.fill({ color: 0xffffff, alpha: 0.001 });

        epicPanelTitle.position.set(24, 20);
        epicPanelMeta.position.set(24, 49);
        epicPanelChevron.position.set(epicCurrentWidth - 36, 22);
      }
    };

    const syncSize = () => {
      if (!host) return;
      const width = Math.max(320, Math.floor(host.clientWidth));
      const height = Math.max(420, Math.floor(host.clientHeight));
      app.renderer.resize(width, height);
      renderFrame();
    };

    const run = async () => {
      await app.init({
        width: Math.max(320, host.clientWidth),
        height: Math.max(420, host.clientHeight),
        backgroundAlpha: viewMode === "line-only" ? 0 : 1,
        antialias: true,
      });

      // Expose globals for PixiJS Chrome DevTools extension
      (globalThis as any)._PIXI_APP_ = app;
      (globalThis as any)._PIXI_STAGE_ = app.stage;
      (globalThis as any)._PIXI_RENDERER_ = app.renderer;

      const imageUrls = Array.from(new Set(
        [
          ...epicVisuals.map((epic) => epic.backgroundImage),
          ...storyVisuals.flatMap((story) => [story.imageUrl, story.tooltipImageUrl]),
        ].filter((imageUrl): imageUrl is string => Boolean(imageUrl)),
      ));

      await Promise.all(imageUrls.map(async (imageUrl) => {
        try {
          const texture = await Assets.load<Texture>(imageUrl);
          textures.set(imageUrl, texture);
        } catch {
          // Ignore invalid or unavailable uploaded images and continue rendering the rest of the timeline.
        }
      }));

      epicVisuals.forEach((epic) => {
        if (!epic.backgroundImage) {
          return;
        }

        const texture = textures.get(epic.backgroundImage);
        if (!texture) {
          return;
        }

        const container = new Container();
        const spriteNodes = epic.backgroundPlacements.map((placement) => {
          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          sprite.visible = false;
          container.addChild(sprite);

          return {
            placement,
            sprite,
          };
        });

        epicBackgroundLayer.addChild(container);
        epicBackgroundNodes.push({
          container,
          spriteNodes,
        });
      });


      app.ticker.minFPS = 30;
      app.ticker.maxFPS = 60;

      initialized = true;

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      app.stage.addChild(root);
      host.innerHTML = "";
      host.appendChild(app.canvas);

      resizeObserverRef.current = new ResizeObserver(syncSize);
      resizeObserverRef.current.observe(host);

      app.ticker.add(renderFrame);
      syncSize();
    };

    run().catch(() => {
      // Ignore init errors during teardown races.
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (initialized) {
        app.ticker.remove(renderFrame);
        app.destroy(true, { children: true });
      }
      appRef.current = null;
    };
  }, [epics, onRenderedAltitudeChange, onStoryCardClick, startGround, stories, targetAltitudeRef, totalDistance, viewMode]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
