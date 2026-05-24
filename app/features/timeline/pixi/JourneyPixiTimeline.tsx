import { useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { BackgroundValue, parseStoredBackground, primaryColorFromBackground } from "../../../shared/domain/background";
import { createDebugChannel } from "../../../shared/debug";

type EpicItem = {
  id: string;
  title: string;
  color: string;
  background: string;
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
  title: string;
  epics: EpicItem[];
  stories: StoryItem[];
  startGround: string;
  wheelMultiplier: number;
  viewMode?: "full" | "line-only";
  onStoryCardClick?: (story: StoryItem) => void;
};

const CARD_WIDTH = 520;
const CARD_HEIGHT = 96;
const CARD_ENTER_DURATION_MS = 380;
const CARD_EXIT_DURATION_MS = 300;
const WHEEL_DELTA_PER_LOGICAL_STEP = 120;
const cardMotionDebug = createDebugChannel("journey-card-motion", {
  enabledByDefault: true,
  maxEntries: 1500,
  mirrorToConsole: true,
});

type CardMotionDirection = "ascending" | "descending";
type CardAnimationPhase =
  | "hidden"
  | "entering"
  | "holding-start"
  | "transitioning-with-scroll"
  | "holding-end"
  | "armed-exit"
  | "exiting";

type CardExitStyle = "dock" | "midair-fade";

type CardAnimationState = {
  direction: CardMotionDirection;
  phase: CardAnimationPhase;
  y: number;
  alpha: number;
  rotation: number;
  phaseElapsedMs: number;
  exitArmedAtScrollTick: number | null;
  queuedTransitionToExit: boolean;
  transitionStartDirectionalTick: number | null;
  transitionStartY: number;
  exitStartY: number;
  exitStyle: CardExitStyle;
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
  return Math.round(a + (b - a) * t);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(value: number): number {
  const t = clamp01(value);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function isLightColor(color: number): boolean {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.67;
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
  stops: Array<{ color: number; percentage: number }>;
  primaryColor: number;
};

type StoryVisual = StoryItem & {
  cardColor: number;
};

function getEpicProgressAtAltitude(altitude: number, epic: EpicItem): number {
  const span = Math.max(1, epic.endPoint - epic.startPoint);
  const raw = (altitude - epic.startPoint) / span;
  return Math.max(0, Math.min(1, raw));
}

function findEpicAtAltitude(altitude: number, epics: EpicVisual[]): EpicVisual | undefined {
  return epics.find((epic) => altitude >= epic.startPoint && altitude <= epic.endPoint);
}

function isCardStoryActive(altitude: number, story: StoryVisual): boolean {
  return altitude >= story.startPoint && altitude <= story.endPoint;
}

function getExitDistance(span: number): number {
  return Math.min(150, Math.max(44, span * 0.28));
}

function getPreExitApproachDistance(span: number): number {
  return Math.min(420, Math.max(140, span * 0.45));
}

export default function JourneyPixiTimeline({
  title,
  epics,
  stories,
  startGround,
  wheelMultiplier,
  viewMode = "full",
  onStoryCardClick,
}: JourneyPixiTimelineProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const altitudeRef = useRef(0);
  const wheelMultiplierRef = useRef(wheelMultiplier);
  const scrollDirectionRef = useRef<1 | -1>(1);
  const scrollTickRef = useRef(0);
  const ascendingScrollTickRef = useRef(0);
  const descendingScrollTickRef = useRef(0);
  const previousAltitudeForTriggersRef = useRef(0);
  const cardAnimationStatesRef = useRef<Map<string, CardAnimationState>>(new Map());

  const [altitude, setAltitude] = useState(0);

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

    const app = new Application();
    appRef.current = app;

    const root = new Container();
    const cardsLayer = new Container();
    const badgeLayer = new Container();
    const hudLayer = new Container();

    root.addChild(cardsLayer);
    root.addChild(badgeLayer);
    root.addChild(hudLayer);

    const background = new Graphics();
    root.addChildAt(background, 0);

    const hudTitle = new Text({
      text: title,
      style: {
        fill: 0xf5f7fa,
        fontFamily: "monospace",
        fontSize: 24,
        fontWeight: "700",
      },
    });

    const hudAltitude = new Text({
      text: formatAltitude(0),
      style: {
        fill: 0xaec5d8,
        fontFamily: "monospace",
        fontSize: 16,
        fontWeight: "600",
      },
    });

    const hudHint = new Text({
      text: "Use mouse wheel to fly through timeline",
      style: {
        fill: 0x8ba4b8,
        fontFamily: "monospace",
        fontSize: 12,
      },
    });

    const hudDistance = new Text({
      text: "0 m / 0 m",
      style: {
        fill: 0xaec5d8,
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "600",
      },
    });

    const distanceTrack = new Graphics();
    const distanceEpicSegments = new Graphics();
    const distanceProgress = new Graphics();
    const distanceMarker = new Graphics();
    const startGroundGraphic = new Graphics();

    const distanceStartLabel = new Text({
      text: "0 m",
      style: {
        fill: 0x6e8aa3,
        fontFamily: "monospace",
        fontSize: 11,
      },
    });

    const distanceEndLabel = new Text({
      text: formatAltitude(totalDistance),
      style: {
        fill: 0x6e8aa3,
        fontFamily: "monospace",
        fontSize: 11,
      },
    });

    hudLayer.addChild(hudTitle);
    hudLayer.addChild(hudAltitude);
    hudLayer.addChild(hudHint);
    hudLayer.addChild(hudDistance);
    hudLayer.addChild(distanceTrack);
    hudLayer.addChild(distanceEpicSegments);
    hudLayer.addChild(distanceProgress);
    hudLayer.addChild(distanceMarker);
    hudLayer.addChild(distanceStartLabel);
    hudLayer.addChild(distanceEndLabel);
    hudLayer.addChild(startGroundGraphic);

    const epicVisuals: EpicVisual[] = epics.map((epic) => {
      const parsedBackground = parseStoredBackground(epic.background, epic.color);
      return {
        ...epic,
        stops: buildPixiStops(parsedBackground, epic.color),
        primaryColor: parseColor(primaryColorFromBackground(parsedBackground)),
      };
    });

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
    const tooltipTitle = new Text({
      text: "",
      style: {
        fill: 0xf5f7fa,
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "700",
      },
    });
    const tooltipBody = new Text({
      text: "",
      style: {
        fill: 0xaec5d8,
        fontFamily: "monospace",
        fontSize: 11,
      },
    });
    tooltipTitle.position.set(10, 8);
    tooltipBody.position.set(10, 26);
    tooltipContainer.addChild(tooltipBg);
    tooltipContainer.addChild(tooltipTitle);
    tooltipContainer.addChild(tooltipBody);
    hudLayer.addChild(tooltipContainer);

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
      const epicLabel = overlappingEpics.length > 0
        ? `Epics: ${overlappingEpics.map((epic) => epic.title).join(" / ")}`
        : "No epic overlap";

      const container = new Container();
      container.eventMode = "static";
      container.cursor = "pointer";
      container.on("pointertap", () => {
        onStoryCardClick?.(story);
      });

      const card = new Graphics();
      card.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 16);
      card.fill({ color: story.cardColor, alpha: 0.93 });
      card.stroke({ color: 0xffffff, width: 1, alpha: 0.42 });

      const tag = new Graphics();
      tag.roundRect(14, 14, 10, CARD_HEIGHT - 28, 5);
      tag.fill({ color: primaryEpicColor, alpha: 0.88 });

      const cardTextColor = isLightColor(story.cardColor) ? 0x18314a : 0xf4fbff;
      const cardSubtleTextColor = isLightColor(story.cardColor) ? 0x33536e : 0xd7ebfb;

      const titleText = new Text({
        text: story.title,
        style: {
          fill: cardTextColor,
          fontFamily: "monospace",
          fontSize: 17,
          fontWeight: "700",
        },
      });
      titleText.position.set(34, 14);

      const epicText = new Text({
        text: epicLabel,
        style: {
          fill: cardSubtleTextColor,
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: "600",
        },
      });
      epicText.position.set(34, 40);

      const descSuffix = story.imageUrl ? " [image mocked]" : "";
      const descText = new Text({
        text: `${story.description || "No description"}${descSuffix}   ${story.startPoint}m → ${story.endPoint}m`,
        style: {
          fill: cardSubtleTextColor,
          fontFamily: "monospace",
          fontSize: 12,
        },
      });
      descText.position.set(34, 62);

      container.addChild(card);
      container.addChild(tag);
      container.addChild(titleText);
      container.addChild(epicText);
      container.addChild(descText);

      cardsLayer.addChild(container);

      return { container, story };
    });

    const lineNodes = storyVisuals
      .filter((story) => story.storyType === "LINE")
      .map((story) => {
        const container = new Container();
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

        const labelText = new Text({
          text: story.lineLabel || story.title,
          style: {
            fill: parseColor(story.lineColor, 0x4ecdc4),
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: "700",
          },
        });

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

    const epicNodes = epicVisuals.map((epic) => {
      const container = new Container();
      const badgeBackground = mixColorNumbers(0x0c1626, epic.primaryColor, 0.22);
      const badgeShadow = mixColorNumbers(0x050c15, epic.primaryColor, 0.08);

      const shadow = new Graphics();
      shadow.roundRect(4, 4, 236, 34, 12);
      shadow.fill({ color: badgeShadow, alpha: 0.55 });

      const badge = new Graphics();
      badge.roundRect(0, 0, 236, 34, 12);
      badge.fill({ color: badgeBackground, alpha: 0.96 });
      badge.stroke({
        color: epic.primaryColor,
        width: 2,
        alpha: 0.9,
      });

      const accent = new Graphics();
      accent.roundRect(10, 8, 6, 18, 3);
      accent.fill({ color: epic.primaryColor, alpha: 0.95 });

      const label = new Text({
        text: epic.title,
        style: {
          fill: 0xf4fbff,
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: "700",
        },
      });
      label.position.set(26, 8);

      container.addChild(shadow);
      container.addChild(badge);
      container.addChild(accent);
      container.addChild(label);
      badgeLayer.addChild(container);

      return { container, epic };
    });

    cardAnimationStatesRef.current = new Map(
      cardNodes.map(({ story }) => [
        story.id,
        {
          direction: "ascending" as CardMotionDirection,
          phase: "hidden" as CardAnimationPhase,
          y: 0,
          alpha: 0,
          rotation: 0,
          phaseElapsedMs: 0,
          exitArmedAtScrollTick: null,
          queuedTransitionToExit: false,
          transitionStartDirectionalTick: null,
          transitionStartY: 0,
          exitStartY: 0,
          exitStyle: "dock" as CardExitStyle,
        },
      ]),
    );
    previousAltitudeForTriggersRef.current = altitudeRef.current;

    const getDirectionalScrollTick = (direction: CardMotionDirection): number => (
      direction === "ascending" ? ascendingScrollTickRef.current : descendingScrollTickRef.current
    );

    const pushCardLog = (
      storyId: string,
      event: string,
      state: CardAnimationState,
      altitude: number,
      previousAltitude: number,
      meta?: Record<string, number | string | boolean | null>,
    ) => {
      cardMotionDebug.log(event, {
        storyId,
        phase: state.phase,
        direction: state.direction,
        altitude,
        previousAltitude,
        y: state.y,
        alpha: state.alpha,
        meta,
      });
    };

    const startCardEnter = (
      state: CardAnimationState,
      direction: CardMotionDirection,
      topDockY: number,
      bottomDockY: number,
      storyId: string,
      altitude: number,
      previousAltitude: number,
    ) => {
      state.direction = direction;
      state.phase = "entering";
      state.phaseElapsedMs = 0;
      state.exitArmedAtScrollTick = null;
      state.queuedTransitionToExit = false;
      state.transitionStartDirectionalTick = null;
      state.alpha = 0.2;
      state.rotation = direction === "ascending" ? -0.035 : 0.035;
      state.y = direction === "ascending" ? -CARD_HEIGHT - 28 : bottomDockY + CARD_HEIGHT + 28;
      state.transitionStartY = state.y;
      state.exitStartY = state.y;
      state.exitStyle = "dock";
      if (direction === "ascending") {
        state.y = Math.min(state.y, topDockY - CARD_HEIGHT - 28);
      }

      pushCardLog(storyId, "enter-start", state, altitude, previousAltitude, {
        topDockY,
        bottomDockY,
      });
    };

    const armOrStartCardExit = (
      state: CardAnimationState,
      direction: CardMotionDirection,
      farDockY: number,
      storyId: string,
      altitude: number,
      previousAltitude: number,
      allowMidairFadeExit = false,
    ) => {
      state.direction = direction;
      const shouldUseMidairFade =
        allowMidairFadeExit
        && state.phase === "transitioning-with-scroll"
        && (direction === "ascending" ? state.y < farDockY - 0.9 : state.y > farDockY + 0.9);

      state.exitStyle = shouldUseMidairFade ? "midair-fade" : "dock";
      state.exitStartY = shouldUseMidairFade ? state.y : farDockY;

      if (state.phase === "holding-end") {
        state.phase = "exiting";
        state.phaseElapsedMs = 0;
        state.exitStartY = farDockY;
        state.exitStyle = "dock";
        state.exitArmedAtScrollTick = null;
        pushCardLog(storyId, "exit-start-immediate", state, altitude, previousAltitude, {
          farDockY,
          exitStyle: state.exitStyle,
        });
        return;
      }

      state.phase = "armed-exit";
      state.phaseElapsedMs = 0;
      state.exitArmedAtScrollTick = getDirectionalScrollTick(direction);
      state.y = state.exitStartY;
      state.alpha = 0.96;
      state.rotation = 0;

      pushCardLog(storyId, "exit-armed", state, altitude, previousAltitude, {
        farDockY,
        exitStyle: state.exitStyle,
        armedTick: state.exitArmedAtScrollTick,
      });
    };

    const renderFrame = (ticker?: { deltaMS?: number }) => {
      const lineOnly = viewMode === "line-only";
      const currentAltitude = altitudeRef.current;
      const previousAltitude = previousAltitudeForTriggersRef.current;
      const frameDeltaMs = Math.min(64, Math.max(0, ticker?.deltaMS ?? 16.66));
      const rendererWidth = app.renderer.width;
      const rendererHeight = app.renderer.height;
      const horizonY = rendererHeight * 0.4;
      const movementDirection: CardMotionDirection | null =
        currentAltitude > previousAltitude
          ? "ascending"
          : currentAltitude < previousAltitude
            ? "descending"
            : null;

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

          const altitudeAtSlice = currentAltitude + (sampleY - horizonY);
          const epicAtSlice = findEpicAtAltitude(altitudeAtSlice, epicVisuals) ?? activeEpicForBackground;
          const progress = getEpicProgressAtAltitude(altitudeAtSlice, epicAtSlice);
          const color = sampleGradientColor(epicAtSlice.stops, progress);

          background.rect(0, y, rendererWidth, h);
          background.fill({ color, alpha: 0.76 });
        }
      }

      hudTitle.visible = !lineOnly;
      hudAltitude.visible = !lineOnly;
      hudHint.visible = !lineOnly;
      hudDistance.visible = !lineOnly;
      hudTitle.position.set(16, 16);
      hudAltitude.position.set(16, 48);
      hudHint.position.set(16, 72);
      hudDistance.position.set(16, 96);
      hudAltitude.text = formatAltitude(currentAltitude);
      hudDistance.text = `${formatAltitude(currentAltitude)} / ${formatAltitude(totalDistance)}`;

      const timelineX = lineOnly ? Math.floor(rendererWidth / 2) - 3 : 24;
      const timelineTop = lineOnly ? 8 : 130;
      const timelineHeight = lineOnly ? Math.max(220, rendererHeight - 16) : Math.max(180, rendererHeight - 170);
      const timelineBottom = timelineTop + timelineHeight;
      const clampedAltitude = totalDistance > 0 ? Math.min(currentAltitude, totalDistance) : 0;
      const progressRatio = totalDistance > 0 ? clampedAltitude / totalDistance : 0;
      const markerY = timelineBottom - progressRatio * timelineHeight;
      const safeTotalDistance = Math.max(totalDistance, 1);
      const activeEpicColor = activeEpicForBackground?.primaryColor ?? parseColor("#4ecdc4");

      distanceTrack.clear();
      distanceTrack.roundRect(timelineX, timelineTop, 6, timelineHeight, 3);
      distanceTrack.fill({ color: lineOnly ? 0x4f75af : 0x16314c, alpha: lineOnly ? 0.88 : 0.9 });

      distanceEpicSegments.clear();
      epicVisuals.forEach((epic) => {
        const segmentStart = Math.max(0, Math.min(totalDistance, epic.startPoint));
        const segmentEnd = Math.max(0, Math.min(totalDistance, epic.endPoint));
        if (segmentEnd <= segmentStart) return;

        const segmentTop = timelineBottom - (segmentEnd / safeTotalDistance) * timelineHeight;
        const segmentBottom = timelineBottom - (segmentStart / safeTotalDistance) * timelineHeight;
        const segmentHeight = Math.max(2, segmentBottom - segmentTop);

        distanceEpicSegments.roundRect(timelineX + 1, segmentTop, 4, segmentHeight, 2);
        distanceEpicSegments.fill({
          color: epic.primaryColor,
          alpha: 0.95,
        });
      });

      distanceProgress.clear();
      distanceProgress.roundRect(
        timelineX,
        markerY,
        6,
        Math.max(2, timelineBottom - markerY),
        3,
      );
      distanceProgress.fill({ color: activeEpicColor, alpha: lineOnly ? 0.52 : 0.25 });

      distanceMarker.clear();
      distanceMarker.circle(timelineX + 3, markerY, 6);
      distanceMarker.fill({ color: 0xf5f7fa });
      distanceMarker.stroke({ color: activeEpicColor, width: 2 });

      distanceStartLabel.visible = !lineOnly;
      distanceEndLabel.visible = !lineOnly;
      distanceStartLabel.position.set(38, timelineBottom - 8);
      distanceEndLabel.position.set(38, timelineTop - 8);
      distanceEndLabel.text = formatAltitude(totalDistance);

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

      const provisionalVisibleCount = Math.max(
        1,
        cardNodes.filter(({ story }) => cardAnimationStatesRef.current.get(story.id)?.phase !== "hidden").length,
      );
      const provisionalSlotGap = 20;
      const provisionalMaxSlotWidth = (rendererWidth - 40 - provisionalSlotGap * (provisionalVisibleCount - 1)) / provisionalVisibleCount;
      const provisionalCardScale = Math.min(1, Math.max(0.34, provisionalMaxSlotWidth / CARD_WIDTH));
      const provisionalScaledCardHeight = CARD_HEIGHT * provisionalCardScale;

      const cardDisplayStates = new Map<string, CardAnimationState>();

      cardNodes.forEach(({ story }) => {
        const state = cardAnimationStatesRef.current.get(story.id);
        if (!state) return;

        const span = Math.max(1, story.endPoint - story.startPoint);
        const exitDistance = getExitDistance(span);
        const topDockY = 72;
        const bottomDockY = rendererHeight - provisionalScaledCardHeight - 72;
        const offscreenY = provisionalScaledCardHeight + 28;
        const stepDistancePx = Math.max(1, rendererHeight * 0.1);
        const crossedStartAscending = movementDirection === "ascending"
          && previousAltitude < story.startPoint
          && currentAltitude >= story.startPoint;
        const crossedEndAscending = movementDirection === "ascending"
          && previousAltitude < story.endPoint
          && currentAltitude >= story.endPoint;
        const crossedEndDescending = movementDirection === "descending"
          && previousAltitude > story.endPoint
          && currentAltitude <= story.endPoint;
        const crossedStartDescending = movementDirection === "descending"
          && previousAltitude > story.startPoint
          && currentAltitude <= story.startPoint;
        const isPastExitBoundaryAscending = state.direction === "ascending" && currentAltitude > story.endPoint;
        const isPastExitBoundaryDescending = state.direction === "descending" && currentAltitude < story.startPoint;
        const isFarPastExitBoundaryAscending = state.direction === "ascending" && currentAltitude > story.endPoint + exitDistance;
        const isFarPastExitBoundaryDescending = state.direction === "descending" && currentAltitude < story.startPoint - exitDistance;

        if (movementDirection === "ascending") {
          if (crossedStartAscending && state.phase === "hidden") {
            startCardEnter(state, "ascending", topDockY, bottomDockY, story.id, currentAltitude, previousAltitude);
            if (crossedEndAscending) {
              state.queuedTransitionToExit = true;
              state.exitStyle = "midair-fade";
              pushCardLog(story.id, "queued-exit-after-enter", state, currentAltitude, previousAltitude);
            }
          } else if (crossedEndAscending && state.phase !== "hidden" && state.direction === "ascending") {
            armOrStartCardExit(state, "ascending", bottomDockY, story.id, currentAltitude, previousAltitude, true);
          }
        } else if (movementDirection === "descending") {
          if (crossedEndDescending && state.phase === "hidden") {
            startCardEnter(state, "descending", topDockY, bottomDockY, story.id, currentAltitude, previousAltitude);
            if (crossedStartDescending) {
              state.queuedTransitionToExit = true;
              state.exitStyle = "midair-fade";
              pushCardLog(story.id, "queued-exit-after-enter", state, currentAltitude, previousAltitude);
            }
          } else if (crossedStartDescending && state.phase !== "hidden" && state.direction === "descending") {
            armOrStartCardExit(state, "descending", topDockY, story.id, currentAltitude, previousAltitude, true);
          }
        }

        if (
          state.phase === "armed-exit"
          && state.exitArmedAtScrollTick !== null
          && getDirectionalScrollTick(state.direction) > state.exitArmedAtScrollTick
        ) {
          state.phase = "exiting";
          state.phaseElapsedMs = 0;
          state.exitArmedAtScrollTick = null;
          pushCardLog(story.id, "exit-start-after-next-scroll", state, currentAltitude, previousAltitude);
        }

        if (
          state.phase !== "hidden"
          && state.phase !== "exiting"
          && (isPastExitBoundaryAscending || isPastExitBoundaryDescending)
        ) {
          state.phase = "exiting";
          state.phaseElapsedMs = 0;
          state.exitArmedAtScrollTick = null;
          state.exitStartY = state.exitStyle === "midair-fade"
            ? state.y
            : (state.direction === "ascending" ? bottomDockY : topDockY);
          pushCardLog(story.id, "forced-exit-after-overshoot", state, currentAltitude, previousAltitude, {
            exitStyle: state.exitStyle,
          });
        }

        if (
          state.phase !== "hidden"
          && (isFarPastExitBoundaryAscending || isFarPastExitBoundaryDescending)
        ) {
          state.phase = "hidden";
          state.phaseElapsedMs = 0;
          state.alpha = 0;
          state.rotation = 0;
          state.transitionStartDirectionalTick = null;
          pushCardLog(story.id, "forced-hidden-after-large-overshoot", state, currentAltitude, previousAltitude);
        }

        switch (state.phase) {
          case "hidden": {
            state.alpha = 0;
            state.rotation = 0;
            break;
          }
          case "entering": {
            state.phaseElapsedMs += frameDeltaMs;
            const progress = clamp01(state.phaseElapsedMs / CARD_ENTER_DURATION_MS);
            const eased = easeOutBack(progress);

            if (state.direction === "ascending") {
              state.y = lerp(-offscreenY, topDockY, eased);
              state.rotation = (1 - progress) * -0.04;
            } else {
              state.y = lerp(rendererHeight + offscreenY, bottomDockY, eased);
              state.rotation = (1 - progress) * 0.04;
            }

            state.alpha = 0.5 + progress * 0.46;

            if (progress >= 1) {
              state.phase = "transitioning-with-scroll";
              state.phaseElapsedMs = 0;
              state.alpha = 0.96;
              state.rotation = 0;
              state.y = state.direction === "ascending" ? topDockY : bottomDockY;
              state.transitionStartY = state.y;
              state.transitionStartDirectionalTick = getDirectionalScrollTick(state.direction);

              if (state.queuedTransitionToExit) {
                state.queuedTransitionToExit = false;
                state.phase = "exiting";
                state.phaseElapsedMs = 0;
                state.exitArmedAtScrollTick = null;
                state.exitStartY = state.y;
                if (state.exitStyle !== "midair-fade") {
                  state.exitStyle = "dock";
                }
                pushCardLog(story.id, "enter-end-immediate-exit", state, currentAltitude, previousAltitude, {
                  exitStyle: state.exitStyle,
                });
              } else {
                pushCardLog(story.id, "enter-end-transition", state, currentAltitude, previousAltitude);
              }
            }
            break;
          }
          case "transitioning-with-scroll": {
            if (state.transitionStartDirectionalTick === null) {
              state.transitionStartDirectionalTick = getDirectionalScrollTick(state.direction);
              state.transitionStartY = state.y;
            }

            const directionalTicks = getDirectionalScrollTick(state.direction);
            const elapsedDirectionalTicks = Math.max(0, directionalTicks - state.transitionStartDirectionalTick);

            if (state.direction === "ascending") {
              const steppedY = state.transitionStartY + elapsedDirectionalTicks * stepDistancePx;
              const targetY = Math.min(bottomDockY, steppedY);
              const smoothing = 1 - Math.exp(-frameDeltaMs / 120);
              const delta = targetY - state.y;
              state.y += delta * smoothing;
              if (Math.abs(delta) < 0.35) {
                state.y = targetY;
              }

              if (state.y >= bottomDockY - 0.9) {
                state.phase = "holding-end";
                state.y = bottomDockY;
              }
            } else {
              const steppedY = state.transitionStartY - elapsedDirectionalTicks * stepDistancePx;
              const targetY = Math.max(topDockY, steppedY);
              const smoothing = 1 - Math.exp(-frameDeltaMs / 120);
              const delta = targetY - state.y;
              state.y += delta * smoothing;
              if (Math.abs(delta) < 0.35) {
                state.y = targetY;
              }

              if (state.y <= topDockY + 0.9) {
                state.phase = "holding-end";
                state.y = topDockY;
              }
            }
            state.alpha = 0.96;
            state.rotation = 0;
            break;
          }
          case "holding-start": {
            state.y = state.direction === "ascending" ? topDockY : bottomDockY;
            state.alpha = 0.96;
            state.rotation = 0;
            break;
          }
          case "holding-end":
          {
            state.y = state.direction === "ascending" ? bottomDockY : topDockY;
            state.alpha = 0.96;
            state.rotation = 0;
            break;
          }
          case "armed-exit": {
            if (state.exitStyle === "dock") {
              state.y = state.direction === "ascending" ? bottomDockY : topDockY;
            } else {
              state.y = state.exitStartY;
            }
            state.alpha = 0.96;
            state.rotation = 0;
            break;
          }
          case "exiting": {
            state.phaseElapsedMs += frameDeltaMs;
            const progress = clamp01(state.phaseElapsedMs / CARD_EXIT_DURATION_MS);
            const eased = easeInBack(progress);
            const fromY = state.exitStartY;

            if (state.exitStyle === "midair-fade") {
              // Short-lifespan stories should disappear in place without bounce-off motion.
              state.y = fromY;
              state.rotation = 0;
              state.alpha = 0.96 - progress * 0.96;
            } else {
              if (state.direction === "ascending") {
                state.y = lerp(fromY, rendererHeight + offscreenY, eased);
                state.rotation = progress * 0.028;
              } else {
                state.y = lerp(fromY, -offscreenY, eased);
                state.rotation = progress * -0.028;
              }

              state.alpha = 0.96 - progress * 0.56;
            }

            if (progress >= 1) {
              state.phase = "hidden";
              state.phaseElapsedMs = 0;
              state.alpha = 0;
              state.rotation = 0;
              state.transitionStartDirectionalTick = null;
              pushCardLog(story.id, "exit-end-hidden", state, currentAltitude, previousAltitude);
            }
            break;
          }
        }

        const isVisibleWhileAnimating = state.phase !== "hidden";

        if (isVisibleWhileAnimating) {
          cardDisplayStates.set(story.id, state);
        }
      });

      const activeCardStories = cardNodes
        .filter(({ story }) => {
          const state = cardDisplayStates.get(story.id);
          return Boolean(state && state.phase !== "hidden");
        })
        .map(({ story }) => story)
        .sort((a, b) => a.startPoint - b.startPoint);

      const stackIndexByStoryId = new Map(activeCardStories.map((story, index) => [story.id, index]));
      const activeStoryCount = Math.max(1, activeCardStories.length);
      const slotGap = 20;
      const maxSlotWidth = (rendererWidth - 40 - slotGap * (activeStoryCount - 1)) / activeStoryCount;
      const cardScale = Math.min(1, Math.max(0.34, maxSlotWidth / CARD_WIDTH));
      const scaledCardWidth = CARD_WIDTH * cardScale;
      const scaledCardHeight = CARD_HEIGHT * cardScale;
      const horizontalQueueWidth = scaledCardWidth * activeStoryCount + slotGap * (activeStoryCount - 1);
      const queueStartX = Math.max(20, (rendererWidth - horizontalQueueWidth) / 2);

      cardNodes.forEach(({ container, story }) => {
        if (lineOnly) {
          container.visible = false;
          return;
        }

        const animationState = cardDisplayStates.get(story.id);
        if (!animationState || animationState.phase === "hidden") {
          container.visible = false;
          return;
        }

        container.visible = true;

        const stackIndex = stackIndexByStoryId.get(story.id) ?? 0;
        const x = queueStartX + stackIndex * (scaledCardWidth + slotGap);
        container.position.set(x, animationState.y);
        container.alpha = animationState.alpha;
        container.rotation = animationState.rotation;
        container.scale.set(cardScale);
      });

      lineNodes.forEach(({ container, story, lineGraphic, hoverArea, labelText }) => {
        if (lineOnly) {
          container.visible = false;
          return;
        }

        const y = horizonY + (story.startPoint - currentAltitude);
        const thickness = Math.max(1, Math.min(64, story.lineWidth));
        const inView = y > -40 && y < rendererHeight + 40;

        container.visible = inView;
        if (!inView) return;

        lineGraphic.clear();
        lineGraphic.rect(0, y - thickness / 2, rendererWidth, thickness);
        lineGraphic.fill({ color: parseColor(story.lineColor, 0x4ecdc4), alpha: 0.9 });

        hoverArea.clear();
        hoverArea.rect(0, y - Math.max(10, thickness), rendererWidth, Math.max(20, thickness * 2));
        hoverArea.fill({ color: 0xffffff, alpha: 0.001 });

        labelText.text = story.lineLabel || story.title;
        labelText.position.set(16, y - thickness / 2 - 18);
      });

      const hoveredLine = lineNodes.find((lineNode) => lineNode.story.id === hoveredLineIdRef.current);
      if (!lineOnly && hoveredLine && hoveredLine.container.visible) {
        const body = [
          hoveredLine.story.tooltipText || hoveredLine.story.description || "No tooltip text",
          hoveredLine.story.tooltipImageUrl ? `[image mocked: ${hoveredLine.story.tooltipImageUrl}]` : "",
        ].filter(Boolean).join("\n");

        tooltipTitle.text = hoveredLine.story.lineLabel || hoveredLine.story.title;
        tooltipBody.text = body;

        const width = Math.max(220, Math.max(tooltipTitle.width, tooltipBody.width) + 20);
        const height = 44 + tooltipBody.height;

        tooltipBg.clear();
        tooltipBg.roundRect(0, 0, width, height, 8);
        tooltipBg.fill({ color: 0x08182a, alpha: 0.95 });
        tooltipBg.stroke({ color: 0x2a4662, width: 1 });

        tooltipContainer.position.set(
          Math.min(rendererWidth - width - 8, pointerPosRef.current.x + 14),
          Math.max(8, pointerPosRef.current.y - height - 12),
        );
        tooltipContainer.visible = true;
      } else {
        tooltipContainer.visible = false;
      }

      epicNodes.forEach(({ container, epic }, index) => {
        if (lineOnly) {
          container.visible = false;
          return;
        }

        const active = currentAltitude >= epic.startPoint && currentAltitude <= epic.endPoint;
        container.visible = active;
        if (!active) return;

        container.position.set(rendererWidth - 250, 110 + index * 36);
      });

      previousAltitudeForTriggersRef.current = currentAltitude;
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

      initialized = true;

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      app.stage.addChild(root);
      host.innerHTML = "";
      host.appendChild(app.canvas);

      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        setAltitude((prev) => {
          const next = prev - event.deltaY * (0.9 * wheelMultiplierRef.current);
          const bounded = Math.max(0, next);
          if (bounded !== prev) {
            scrollDirectionRef.current = bounded > prev ? 1 : -1;
            const logicalSteps = Math.max(
              1,
              Math.round(Math.abs(event.deltaY) / WHEEL_DELTA_PER_LOGICAL_STEP),
            );
            scrollTickRef.current += logicalSteps;
            if (scrollDirectionRef.current > 0) {
              ascendingScrollTickRef.current += logicalSteps;
            } else {
              descendingScrollTickRef.current += logicalSteps;
            }
          }
          altitudeRef.current = bounded;
          return bounded;
        });
      };

      host.addEventListener("wheel", onWheel, { passive: false });

      resizeObserverRef.current = new ResizeObserver(syncSize);
      resizeObserverRef.current.observe(host);

      app.ticker.add(renderFrame);
      syncSize();

      return () => {
        host.removeEventListener("wheel", onWheel);
      };
    };

    let disposeWheel: (() => void) | undefined;
    run().then((dispose) => {
      disposeWheel = dispose;
    }).catch(() => {
      // Ignore init errors during teardown races.
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      disposeWheel?.();
      if (initialized) {
        app.ticker.remove(renderFrame);
        app.destroy(true, { children: true });
      }
      appRef.current = null;
    };
  }, [epics, stories, title, totalDistance, startGround, viewMode, onStoryCardClick]);

  useEffect(() => {
    altitudeRef.current = altitude;
  }, [altitude]);

  useEffect(() => {
    wheelMultiplierRef.current = wheelMultiplier;
  }, [wheelMultiplier]);

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
