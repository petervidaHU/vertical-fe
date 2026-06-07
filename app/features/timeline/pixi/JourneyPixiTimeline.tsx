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
import { getCardPresentation, getLinePresentation } from "./layout/storyPresentation";
import { smoothToward, stepAltitudeMotor } from "./motion/altitudeMotor";
import {
  DEFAULT_SCROLL_MULTIPLIER,
  canDecreaseScrollMultiplier,
  canIncreaseScrollMultiplier,
  formatScrollMultiplierValue,
  stepScrollMultiplier,
} from "../domain/scrollMultiplier";

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
const CARD_WIDTH = 468;
const CARD_HEIGHT = 170;
const CARD_STACK_GAP = 24;
const CARD_COLUMN_GAP = 28;
const CARD_SIDE_PADDING = 24;
const CARD_AVATAR_SIZE = 112;
const CARD_AVATAR_X = 18;
const CARD_AVATAR_Y = (CARD_HEIGHT - CARD_AVATAR_SIZE) / 2;
const CARD_CONTENT_X = CARD_AVATAR_X + CARD_AVATAR_SIZE + 22;
const CARD_CONTENT_WIDTH = CARD_WIDTH - CARD_CONTENT_X - 22;
const CARD_SCALE_MIN = 0.8;
const EPIC_HEADER_WIDTH = 236;
const EPIC_HEADER_HEIGHT = 86;
const EPIC_PANEL_WIDTH = 420;
const EPIC_PANEL_PADDING = 24;
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
  preferredYs: number[],
  minY: number,
  maxY: number,
  cardHeight: number,
  stackGap: number,
): number[] {
  if (preferredYs.length === 0) {
    return [];
  }

  const maxTopY = Math.max(minY, maxY);
  const positions: number[] = [];
  let lastBottom = minY - stackGap;

  preferredYs.forEach((preferredY) => {
    const clampedPreferredY = Math.max(minY, Math.min(maxTopY, preferredY));
    const nextY = Math.max(clampedPreferredY, lastBottom + stackGap);

    positions.push(nextY);
    lastBottom = nextY + cardHeight;
  });

  const maxBottom = maxY + cardHeight;
  const overflow = positions[positions.length - 1] + cardHeight - maxBottom;

  if (overflow > 0) {
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= overflow;
    }
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(
      positions[index],
      positions[index + 1] - cardHeight - stackGap,
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
  items: Array<{ id: string; preferredY: number }>,
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
  },
): Map<string, CardStackLayout> {
  const layouts = new Map<string, CardStackLayout>();

  const cardWidth = options?.cardWidth ?? CARD_WIDTH;
  const cardHeight = options?.cardHeight ?? CARD_HEIGHT;
  const stackGap = options?.stackGap ?? CARD_STACK_GAP;
  const columnGap = options?.columnGap ?? CARD_COLUMN_GAP;
  const leftInset = options?.leftInset ?? CARD_SIDE_PADDING;
  const rightInset = options?.rightInset ?? CARD_SIDE_PADDING;

  if (items.length === 0) {
    return layouts;
  }

  const availableHeight = Math.max(cardHeight, bottomDockY - topDockY + cardHeight);
  const columnCapacity = Math.max(1, Math.floor((availableHeight + stackGap) / (cardHeight + stackGap)));
  const availableWidth = Math.max(cardWidth, rendererWidth - leftInset - rightInset);
  const maxColumnsThatFit = Math.max(
    1,
    Math.floor((Math.max(cardWidth, availableWidth) + columnGap) / (cardWidth + columnGap)),
  );
  const columnCount = Math.max(1, Math.min(maxColumnsThatFit, items.length));
  const totalWidth = columnCount * cardWidth + (columnCount - 1) * columnGap;
  const startX = leftInset + Math.max(0, Math.floor((availableWidth - totalWidth) / 2));
  const columns = Array.from({ length: columnCount }, () => [] as Array<{ id: string; preferredY: number }>);

  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const columnItems = [...columns[columnIndex]].sort((a, b) => a.preferredY - b.preferredY);
    const columnYs = resolveStackedCardColumnYs(
      columnItems.map((item) => item.preferredY),
      topDockY,
      bottomDockY,
      cardHeight,
      stackGap,
    );
    const x = startX + columnIndex * (cardWidth + columnGap);

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
  const cardStories = overlappingStories.filter((story) => story.storyType === "CARD");
  const lineStories = overlappingStories.filter((story) => story.storyType === "LINE");
  const visibleStories = overlappingStories.slice(0, 6);
  const remainingCount = Math.max(0, overlappingStories.length - visibleStories.length);

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
      remainingCount > 0 ? `<p>Plus ${remainingCount} more story moments in this altitude band.</p>` : "",
    ].join("")
    : "<p>No stories overlap this epic yet.</p>";

  return [
    '<div style="line-height:1.55;">',
    `<p><strong>${escapeHtml(epic.title)}</strong></p>`,
    `<p><strong>Altitude band</strong><br/>${escapeHtml(formatAltitude(epic.startPoint))} to ${escapeHtml(formatAltitude(epic.endPoint))}</p>`,
    `<p>This layer currently contains <strong>${overlappingStories.length}</strong> story moments, with ${cardStories.length} card stories and ${lineStories.length} line markers.</p>`,
    "<p><strong>Highlights</strong></p>",
    highlightMarkup,
    "</div>",
  ].join("");
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
    const speedDecreaseLabel = new Text({
      text: "<",
      style: {
        fill: 0x34424f,
        fontFamily: DISPLAY_FONT,
        fontSize: 18,
        fontWeight: "700",
      },
    });
    speedDecreaseButton.eventMode = "static";
    speedDecreaseButton.cursor = "pointer";

    const speedIncreaseButton = new Container();
    const speedIncreaseBg = new Graphics();
    const speedIncreaseLabel = new Text({
      text: ">",
      style: {
        fill: 0x34424f,
        fontFamily: DISPLAY_FONT,
        fontSize: 18,
        fontWeight: "700",
      },
    });
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
    speedDecreaseButton.addChild(speedDecreaseLabel);
    speedIncreaseButton.addChild(speedIncreaseBg);
    speedIncreaseButton.addChild(speedIncreaseLabel);

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
    const epicPanelDivider = new Graphics();
    const epicPanelHeaderHitArea = new Graphics();
    const epicPanelAccent = new Graphics();
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
        fontSize: 11,
        fontWeight: "700",
      },
    });
    const epicPanelCue = new Text({
      text: "Tap to expand",
      style: {
        fill: 0x6d7e90,
        fontFamily: BODY_FONT,
        fontSize: 11,
        fontWeight: "700",
      },
    });
    const epicPanelChevron = new Text({
      text: "+",
      style: {
        fill: 0x2a3846,
        fontFamily: DISPLAY_FONT,
        fontSize: 24,
        fontWeight: "700",
      },
    });
    const epicPanelBodyLabel = new Text({
      text: "Inside this layer",
      style: {
        fill: 0x8a6f4c,
        fontFamily: SERIF_FONT,
        fontSize: 12,
        fontWeight: "700",
      },
    });
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
    epicPanelBody.position.set(24, 112);
    epicPanelContainer.addChild(epicPanelShadow);
    epicPanelContainer.addChild(epicPanelBackground);
    epicPanelContainer.addChild(epicPanelDivider);
    epicPanelContainer.addChild(epicPanelHeaderHitArea);
    epicPanelContainer.addChild(epicPanelAccent);
    epicPanelContainer.addChild(epicPanelTitle);
    epicPanelContainer.addChild(epicPanelMeta);
    epicPanelContainer.addChild(epicPanelCue);
    epicPanelContainer.addChild(epicPanelChevron);
    epicPanelContainer.addChild(epicPanelBodyLabel);
    epicPanelContainer.addChild(epicPanelBody);

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

    const cardNodes = storyVisuals
      .filter((story) => story.storyType === "CARD")
      .map((story) => {
        const overlappingEpics = epics.filter(
          (epic) => epic.startPoint <= story.endPoint && epic.endPoint >= story.startPoint,
        );
        const primaryEpic = overlappingEpics[0];
        const primaryEpicColor = primaryEpic
          ? (epicVisualById.get(primaryEpic.id)?.primaryColor ?? parseColor("#4ecdc4"))
          : parseColor("#4ecdc4");
        const epicLabel = `Epics: ${summarizeEpicTitles(overlappingEpics)}`;

        const container = new Container();
        container.eventMode = "static";
        container.cursor = "pointer";
        let hovered = false;
        let hoverAmount = 0;

        container.on("pointerenter", () => {
          hovered = true;
        });
        container.on("pointerleave", () => {
          hovered = false;
        });
        container.visible = false;
        container.on("pointertap", () => {
          onStoryCardClick?.(story);
        });

        const cardBaseColor = mixColorNumbers(0xfff5e5, story.cardColor, 0.14);
        const cardTextColor = 0x1f262d;
        const cardSubtleTextColor = 0x63584c;

        // Outer shadow - deep layer for depth
        const shadowDeep = new Graphics();
        shadowDeep.roundRect(12, 18, CARD_WIDTH - 12, CARD_HEIGHT - 8, CARD_HEIGHT / 2);
        shadowDeep.fill({ color: mixColorNumbers(0x705734, primaryEpicColor, 0.22), alpha: 0.42 });

        // Outer shadow - medium layer
        const shadow = new Graphics();
        shadow.roundRect(8, 12, CARD_WIDTH - 8, CARD_HEIGHT - 4, CARD_HEIGHT / 2);
        shadow.fill({ color: mixColorNumbers(0x8a7040, primaryEpicColor, 0.18), alpha: 0.28 });

        // Outer shadow - soft layer
        const shadowSoft = new Graphics();
        shadowSoft.roundRect(3, 6, CARD_WIDTH - 2, CARD_HEIGHT - 2, CARD_HEIGHT / 2);
        shadowSoft.fill({ color: mixColorNumbers(0x9a8a5a, primaryEpicColor, 0.14), alpha: 0.16 });

        // Main card body with pill shape
        const card = new Graphics();
        card.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_HEIGHT / 2);
        card.fill({ color: cardBaseColor, alpha: 0.98 });
        card.stroke({ color: 0xfffbf4, width: 2, alpha: 0.82 });

        // Inner shadow for inset depth effect
        const innerShadow = new Graphics();
        innerShadow.roundRect(2, 2, CARD_WIDTH - 4, CARD_HEIGHT - 4, CARD_HEIGHT / 2 - 2);
        innerShadow.stroke({
          color: mixColorNumbers(0x8a6a42, primaryEpicColor, 0.3),
          width: 1.5,
          alpha: 0.12,
        });

        // Top highlight for glossy effect
        const cardHighlight = new Graphics();
        cardHighlight.roundRect(20, 10, 116, 16, 8);
        cardHighlight.fill({ color: 0xffffff, alpha: 0.12 });

        const avatarBackdrop = new Graphics();
        avatarBackdrop.circle(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_SIZE / 2 + 6,
        );
        avatarBackdrop.fill({ color: mixColorNumbers(0xf8e6c7, primaryEpicColor, 0.24), alpha: 0.9 });

        const avatarMask = new Graphics();
        avatarMask.circle(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_SIZE / 2,
        );
        avatarMask.fill({ color: 0xffffff, alpha: 1 });
        avatarMask.visible = false;

        const avatarPlaceholder = new Graphics();
        avatarPlaceholder.circle(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_SIZE / 2,
        );
        avatarPlaceholder.fill({ color: mixColorNumbers(0xfff5e2, primaryEpicColor, 0.3), alpha: 1 });

        const avatarInitials = new Text({
          text: getStoryInitials(story.title),
          style: {
            fill: mixColorNumbers(0x6c5534, primaryEpicColor, 0.38),
            fontFamily: DISPLAY_FONT,
            fontSize: 30,
            fontWeight: "700",
          },
        });
        avatarInitials.anchor.set(0.5);
        avatarInitials.position.set(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
        );

        const avatarRing = new Graphics();
        avatarRing.circle(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_SIZE / 2 + 2,
        );
        avatarRing.stroke({ color: 0xffffff, width: 6, alpha: 0.7 });
        avatarRing.circle(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_SIZE / 2 + 2,
        );
        avatarRing.stroke({ color: primaryEpicColor, width: 1.5, alpha: 0.4 });

        const titleText = new Text({
          text: truncateText(story.title, 46),
          style: {
            fill: cardTextColor,
            breakWords: true,
            fontFamily: DISPLAY_FONT,
            fontSize: 26,
            fontWeight: "700",
            lineHeight: 28,
            wordWrap: true,
            wordWrapWidth: CARD_CONTENT_WIDTH,
          },
        });
        titleText.position.set(CARD_CONTENT_X, 24);

        const epicText = new Text({
          text: epicLabel,
          style: {
            fill: cardSubtleTextColor,
            breakWords: true,
            fontFamily: BODY_FONT,
            fontSize: 12,
            fontWeight: "600",
            lineHeight: 16,
            wordWrap: true,
            wordWrapWidth: CARD_CONTENT_WIDTH,
          },
        });
        epicText.position.set(CARD_CONTENT_X, 82);

        const descText = new Text({
          text: truncateText(story.description || (story.lineLabel || "No description added yet."), 78),
          style: {
            fill: cardSubtleTextColor,
            breakWords: true,
            fontFamily: BODY_FONT,
            fontSize: 13,
            lineHeight: 19,
            wordWrap: true,
            wordWrapWidth: CARD_CONTENT_WIDTH,
          },
        });
        descText.position.set(CARD_CONTENT_X, 102);

        const footerText = new Text({
          text: `${formatAltitude(story.startPoint)} -> ${formatAltitude(story.endPoint)}`,
          style: {
            fill: mixColorNumbers(0x7a6141, primaryEpicColor, 0.36),
            fontFamily: SERIF_FONT,
            fontSize: 13,
            fontWeight: "700",
          },
        });
        footerText.position.set(CARD_CONTENT_X, CARD_HEIGHT - 24);

        const footerRule = new Graphics();
        footerRule.roundRect(CARD_CONTENT_X, CARD_HEIGHT - 30, 84, 2, 1);
        footerRule.fill({ color: primaryEpicColor, alpha: 0.28 });

        // Image container - will be added only if image exists
        const imageContainer = new Container();
        imageContainer.position.set(CARD_AVATAR_X, CARD_AVATAR_Y);
        
        // Image frame background - circular
        const imageFrame = new Graphics();
        const avatarRadius = CARD_AVATAR_SIZE / 2;
        imageFrame.circle(avatarRadius, avatarRadius, avatarRadius);
        imageFrame.fill({ color: mixColorNumbers(0xf0e6d0, primaryEpicColor, 0.16), alpha: 0.7 });
        imageFrame.stroke({ color: mixColorNumbers(0xdcc9b0, primaryEpicColor, 0.24), width: 1, alpha: 0.6 });
        imageContainer.addChild(imageFrame);

        // Create circular mask for images (applied when image is added)
        const circularMask = new Graphics();
        circularMask.circle(avatarRadius, avatarRadius, avatarRadius);
        circularMask.fill({ color: 0xffffff });
        imageContainer.addChild(circularMask);

        let imageContainerAdded = false;

        container.addChild(shadowDeep);
        container.addChild(shadow);
        container.addChild(shadowSoft);
        container.addChild(card);
        container.addChild(innerShadow);
        container.addChild(cardHighlight);
        container.addChild(avatarBackdrop);
        container.addChild(avatarMask);
        container.addChild(avatarPlaceholder);
        container.addChild(avatarInitials);
        container.addChild(avatarRing);
        container.addChild(titleText);
        container.addChild(epicText);
        container.addChild(descText);
        container.addChild(footerRule);
        container.addChild(footerText);

        cardsLayer.addChild(container);

        return {
          avatarBackdrop,
          avatarInitials,
          avatarMask,
          avatarPlaceholder,
          avatarRing,
          circularMask,
          container,
          footerText,
          imageContainer,
          imageFrame,
          imageContainerAdded: () => imageContainerAdded,
          setImageContainerAdded: (val: boolean) => {
            imageContainerAdded = val;
          },
          shadow,
          shadowDeep,
          shadowSoft,
          hovered: () => hovered,
          hoverAmount: () => hoverAmount,
          setHoverAmount: (value: number) => {
            hoverAmount = value;
          },
          story,
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
      const currentAltitude = stepAltitudeMotor({
        current: renderedAltitudeRef.current,
        target: targetAltitudeRef.current,
        deltaMs: frameDeltaMs,
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
      speedDecreaseLabel.position.set(10 - speedDecreaseLabel.width / 2, 10 - speedDecreaseLabel.height / 2 - 1);

      speedIncreaseButton.alpha = canIncreaseSpeed ? 1 : 0.45;
      speedIncreaseButton.cursor = canIncreaseSpeed ? "pointer" : "default";
      speedIncreaseButton.position.set(speedWidth - 28, 6);
      speedIncreaseBg.clear();
      speedIncreaseBg.circle(10, 10, 10);
      speedIncreaseBg.fill({ color: canIncreaseSpeed ? 0xfbf4e6 : 0xf1f4f7, alpha: 1 });
      speedIncreaseBg.stroke({ color: canIncreaseSpeed ? 0xe8d6ba : 0xd8e1ea, width: 1, alpha: 0.9 });
      speedIncreaseLabel.position.set(10 - speedIncreaseLabel.width / 2, 10 - speedIncreaseLabel.height / 2 - 1);

      const uiTopBoundary = lineOnly ? 8 : topInfoY + topInfoHeight + 20;
      const epicPanelProgress = smoothToward(
        epicAccordionProgressRef.current,
        epicAccordionOpenRef.current ? 1 : 0,
        0.0065,
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

      const groundStops = buildPixiStops(parseStoredBackground(startGround, "#4b3726"), "#4b3726");
      const groundWidth = rendererWidth;
      const groundHeight = 10;
      const groundX = 0;
      const groundY = rendererHeight - 42 + currentAltitude;

      startGroundGraphic.clear();
      if (!lineOnly && groundY > -groundHeight && groundY < rendererHeight + groundHeight) {
        startGroundGraphic.roundRect(groundX, groundY, groundWidth, groundHeight, 2);
        startGroundGraphic.fill({ color: 0x1b1b1b, alpha: 0.8 });
        drawGradientRect(startGroundGraphic, groundX, groundY, groundWidth, groundHeight, groundStops, 0.9, 64);
        startGroundGraphic.stroke({ color: 0x2b2b2b, width: 1 });
      }

      const epicPanelWidth = Math.min(EPIC_PANEL_WIDTH, Math.max(280, rendererWidth - EPIC_PANEL_PADDING * 2));
      const epicPanelHeight = rendererHeight - EPIC_PANEL_PADDING * 2;
      const epicClosedX = Math.max(EPIC_PANEL_PADDING, rendererWidth - EPIC_PANEL_PADDING - EPIC_HEADER_WIDTH);
      const epicOpenX = Math.max(EPIC_PANEL_PADDING, rendererWidth - EPIC_PANEL_PADDING - epicPanelWidth);
      const reservedRightInset = lineOnly ? 24 : EPIC_HEADER_WIDTH + 28;
      const cardScale = getCardScale(rendererWidth, 72, reservedRightInset);
      const scaledCardWidth = CARD_WIDTH * cardScale;
      const scaledCardHeight = CARD_HEIGHT * cardScale;
      const topDockY = uiTopBoundary + 14;
      const bottomDockY = rendererHeight - scaledCardHeight - 110;
      const offscreenDistance = scaledCardHeight + 28;
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
      const visibleCardLayouts = buildCardStackLayouts(
        cardNodes
          .map(({ story }) => ({
            id: story.id,
            preferredY: cardPresentations.get(story.id)?.y ?? topDockY,
          }))
          .filter(({ id }) => cardPresentations.get(id)?.visible),
        rendererWidth,
        topDockY,
        bottomDockY,
        {
          cardWidth: scaledCardWidth,
          cardHeight: scaledCardHeight,
          leftInset: 86,
          rightInset: reservedRightInset,
        },
      );

      cardNodes.forEach(({ avatarBackdrop, avatarInitials, avatarMask, avatarPlaceholder, avatarRing, circularMask, container, hovered, hoverAmount, setHoverAmount, shadow, shadowDeep, shadowSoft, story, imageContainer, imageFrame, imageContainerAdded, setImageContainerAdded }) => {
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

        const nextHoverAmount = smoothToward(hoverAmount(), hovered() ? 1 : 0, 0.01, frameDeltaMs);
        setHoverAmount(nextHoverAmount);
        const resolvedX = layoutState?.x ?? targetLayout.x;
        const resolvedY = layoutState?.y ?? targetLayout.y;
        const cardCenterX = resolvedX + scaledCardWidth / 2;
        const cardCenterY = resolvedY + scaledCardHeight / 2;
        const centerDistance = Math.hypot(cardCenterX - rendererWidth / 2, cardCenterY - rendererHeight / 2);
        const maxCenterDistance = Math.hypot(rendererWidth / 2, rendererHeight / 2);
        const centerLift = 1 - clamp01(centerDistance / Math.max(1, maxCenterDistance));
        const shadowEmphasis = clamp01(centerLift + nextHoverAmount * 0.22);

        shadowSoft.alpha = lerp(0.72, 1, shadowEmphasis);
        shadow.alpha = lerp(0.76, 1, shadowEmphasis);
        shadowDeep.alpha = lerp(0.82, 1, shadowEmphasis);

        // Eased scale transition on hover (120ms half-life for smooth response)
        const targetCardScale = cardScale * (1 + nextHoverAmount * 0.025);
        const currentCardScale = cardScaleStates.get(story.id) ?? cardScale;
        const easedCardScale = smoothToward(currentCardScale, targetCardScale, 120, frameDeltaMs);
        cardScaleStates.set(story.id, easedCardScale);

        container.position.set(resolvedX, resolvedY);
        container.alpha = clampNumber(presentation.alpha + nextHoverAmount * 0.08, 0, 1);
        container.rotation = presentation.rotation * (1 - nextHoverAmount * 0.72);
        container.zIndex = Math.round(centerLift * 100) + Math.round(nextHoverAmount * 200);
        container.scale.set(easedCardScale);

        // Render card image if available, hide avatar when image exists
        const cardImageUrl = story.imageUrl || "";
        const cardImageTexture = cardImageUrl ? textures.get(cardImageUrl) : undefined;
        const hasImage = !!cardImageTexture;

        // Hide avatar group when image is present
        avatarBackdrop.visible = !hasImage;
        avatarMask.visible = !hasImage;
        avatarPlaceholder.visible = !hasImage;
        avatarInitials.visible = !hasImage;
        avatarRing.visible = !hasImage;

        if (hasImage && cardImageTexture) {
          // Add image container to scene if not already added
          if (!imageContainerAdded()) {
            container.addChild(imageContainer);
            setImageContainerAdded(true);
          }

          // Create or update image sprite
          let imageSprite = cardImageSprites.get(story.id);
          if (!imageSprite) {
            imageSprite = new Sprite(cardImageTexture);
            imageContainer.addChild(imageSprite);
            cardImageSprites.set(story.id, imageSprite);
            // Apply circular mask to clip image to circle shape
            imageSprite.mask = circularMask;
            timelineLogger.logImageLoad(story.id, cardImageUrl, true);
          } else {
            imageSprite.texture = cardImageTexture;
          }

          // Scale image to fit within avatar size circle
          const imageDims = fitDimensionsWithinBox(cardImageTexture.width, cardImageTexture.height, CARD_AVATAR_SIZE, CARD_AVATAR_SIZE);
          const imageScale = imageDims.width / cardImageTexture.width;
          imageSprite.scale.set(imageScale);
          // Center within the avatar circle
          imageSprite.position.set(
            (CARD_AVATAR_SIZE - imageDims.width) / 2,
            (CARD_AVATAR_SIZE - imageDims.height) / 2
          );
        } else {
          // Remove image container from scene if it was added
          if (imageContainerAdded()) {
            container.removeChild(imageContainer);
            setImageContainerAdded(false);
          }

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
        const overlappingStories = storyVisuals.filter(
          (story) => activeEpicForBackground.startPoint <= story.endPoint && activeEpicForBackground.endPoint >= story.startPoint,
        );
        const epicCurrentWidth = lerp(EPIC_HEADER_WIDTH, epicPanelWidth, epicPanelProgress);
        const epicCurrentHeight = lerp(EPIC_HEADER_HEIGHT, epicPanelHeight, epicPanelProgress);
        const epicPanelX = lerp(epicClosedX, epicOpenX, epicPanelProgress);
        const epicBodyVisible = epicPanelProgress > 0.18;
        const panelBodyAlpha = clamp01((epicPanelProgress - 0.08) / 0.92);
        const panelBodyOffsetY = lerp(16, 0, epicPanelProgress);

        epicPanelContainer.visible = true;
        epicPanelContainer.position.set(epicPanelX, EPIC_PANEL_PADDING);
        epicPanelContainer.alpha = 0.92 + epicPanelProgress * 0.08;

        epicPanelTitle.text = activeEpicForBackground.title;
        epicPanelMeta.text = `${formatAltitude(activeEpicForBackground.startPoint)} -> ${formatAltitude(activeEpicForBackground.endPoint)}  |  ${overlappingStories.length} stories`;
        epicPanelCue.text = epicAccordionOpenRef.current ? "Tap to collapse" : "Tap to expand";
        epicPanelChevron.text = epicAccordionOpenRef.current ? "-" : "+";
        epicPanelBodyLabel.visible = epicBodyVisible;
        epicPanelBodyLabel.alpha = panelBodyAlpha;
        epicPanelBody.visible = epicBodyVisible;
        epicPanelBody.alpha = panelBodyAlpha;
        epicPanelBody.position.set(24, 112 + panelBodyOffsetY);

        if (lastEpicPanelId !== activeEpicForBackground.id || lastEpicPanelHtml === "") {
          lastEpicPanelId = activeEpicForBackground.id;
          lastEpicPanelHtml = buildEpicPanelHtml(activeEpicForBackground, storyVisuals);
          epicPanelBody.text = lastEpicPanelHtml;
        }
        epicPanelBody.style.wordWrapWidth = Math.max(220, epicPanelWidth - 48);

        epicPanelShadow.clear();
        epicPanelShadow.roundRect(10, 14, epicCurrentWidth + 4, epicCurrentHeight + 8, 30);
        epicPanelShadow.fill({ color: mixColorNumbers(0x735732, activeEpicColor, 0.18), alpha: lerp(0.16, 0.28, epicPanelProgress) });

        epicPanelBackground.clear();
        epicPanelBackground.roundRect(0, 0, epicCurrentWidth, epicCurrentHeight, 28);
        epicPanelBackground.fill({ color: 0xfff6e8, alpha: lerp(0.76, 0.97, epicPanelProgress) });
        epicPanelBackground.stroke({ color: 0xffffff, width: 2, alpha: lerp(0.54, 0.8, epicPanelProgress) });

        epicPanelAccent.clear();
        epicPanelAccent.roundRect(22, 24, 8, 32, 4);
        epicPanelAccent.fill({ color: activeEpicColor, alpha: 0.88 });

        epicPanelDivider.clear();
        if (epicBodyVisible) {
          epicPanelDivider.roundRect(24, 92, epicCurrentWidth - 48, 2, 1);
          epicPanelDivider.fill({ color: mixColorNumbers(0xe7d2b4, activeEpicColor, 0.16), alpha: 0.9 });
        }

        epicPanelHeaderHitArea.clear();
        epicPanelHeaderHitArea.roundRect(0, 0, epicCurrentWidth, Math.min(epicCurrentHeight, EPIC_HEADER_HEIGHT), 26);
        epicPanelHeaderHitArea.fill({ color: 0xffffff, alpha: 0.001 });

        epicPanelTitle.position.set(42, 22);
        epicPanelMeta.position.set(42, 48);
        epicPanelCue.position.set(epicCurrentWidth - epicPanelCue.width - 54, 28);
        epicPanelChevron.position.set(epicCurrentWidth - 44, 20);
        epicPanelBodyLabel.position.set(24, 104);
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

      cardNodes.forEach(({ avatarInitials, avatarMask, avatarPlaceholder, container, story }) => {
        if (!story.imageUrl) {
          return;
        }

        const texture = textures.get(story.imageUrl);
        if (!texture) {
          return;
        }

        const sprite = new Sprite(texture);
        const coverScale = Math.max(
          CARD_AVATAR_SIZE / Math.max(1, texture.width),
          CARD_AVATAR_SIZE / Math.max(1, texture.height),
        );

        sprite.anchor.set(0.5);
        sprite.position.set(
          CARD_AVATAR_X + CARD_AVATAR_SIZE / 2,
          CARD_AVATAR_Y + CARD_AVATAR_SIZE / 2,
        );
        sprite.scale.set(coverScale);
        sprite.alpha = 0.96;
        sprite.mask = avatarMask;
        avatarPlaceholder.visible = false;
        avatarInitials.visible = false;
        container.addChildAt(sprite, container.getChildIndex(avatarMask));
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
