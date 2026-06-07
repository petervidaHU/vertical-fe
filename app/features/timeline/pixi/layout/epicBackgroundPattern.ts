export const EPIC_BACKGROUND_PATTERN_TOP_PADDING = 56;
export const EPIC_BACKGROUND_PATTERN_BOTTOM_PADDING = 72;

export type BackgroundPatternConfig = {
  /** 0-1 density; higher = more sprites. Default 0.5. */
  density: number;
  /** Minimum sprite scale. Default 0.55. Range 0.1-3. */
  minScale: number;
  /** Maximum sprite scale. Default 1.2. Range 0.1-3. */
  maxScale: number;
  /** Minimum horizontal position (0-1 ratio of width). Default 0.12. */
  minXRatio: number;
  /** Maximum horizontal position (0-1 ratio of width). Default 0.88. */
  maxXRatio: number;
};

const DEFAULT_CONFIG: BackgroundPatternConfig = {
  density: 0.5,
  minScale: 0.55,
  maxScale: 1.2,
  minXRatio: 0.12,
  maxXRatio: 0.88,
};

const MIN_ALTITUDE_GAP_BASE = 110;
const MAX_ALTITUDE_GAP_BASE = 210;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeBackgroundPatternConfig(value: unknown): BackgroundPatternConfig | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    try {
      return normalizeBackgroundPatternConfig(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!isRecord(value)) {
    return null;
  }

  const density = parseFiniteNumber(value.density);
  const minScale = parseFiniteNumber(value.minScale);
  const maxScale = parseFiniteNumber(value.maxScale);
  const minXRatio = parseFiniteNumber(value.minXRatio);
  const maxXRatio = parseFiniteNumber(value.maxXRatio);

  if ([density, minScale, maxScale, minXRatio, maxXRatio].every((entry) => entry === null)) {
    return null;
  }

  const normalizedDensity = Math.max(0, Math.min(1, density ?? DEFAULT_CONFIG.density));
  const normalizedMinScale = Math.max(0.1, Math.min(3, minScale ?? DEFAULT_CONFIG.minScale));
  const normalizedMaxScale = Math.max(normalizedMinScale, Math.min(3, maxScale ?? DEFAULT_CONFIG.maxScale));
  const normalizedMinXRatio = Math.max(0, Math.min(1, minXRatio ?? DEFAULT_CONFIG.minXRatio));
  const normalizedMaxXRatio = Math.max(normalizedMinXRatio, Math.min(1, maxXRatio ?? DEFAULT_CONFIG.maxXRatio));

  return {
    density: normalizedDensity,
    minScale: normalizedMinScale,
    maxScale: normalizedMaxScale,
    minXRatio: normalizedMinXRatio,
    maxXRatio: normalizedMaxXRatio,
  };
}

function altitudeGapRange(density: number): { minGap: number; maxGap: number } {
  const clamped = Math.max(0, Math.min(1, density));
  // At density 0: wide gaps (180-260), at density 1: tight gaps (55-130)
  const minGap = Math.round(lerp(180, 55, clamped));
  const maxGap = Math.round(lerp(260, 130, clamped));
  return { minGap, maxGap };
}

export type EpicBackgroundPatternPlacement = {
  alpha: number;
  altitude: number;
  id: string;
  rotation: number;
  scale: number;
  xRatio: number;
};

type EpicBackgroundPatternInput = {
  backgroundImage?: string | null;
  backgroundPatternConfig?: unknown;
  endPoint: number;
  id: string;
  startPoint: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hashString(value: string): number {
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let current = seed >>> 0;

  return () => {
    current += 0x6d2b79f5;
    let next = current;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function altitudeToScreenY(
  altitude: number,
  currentAltitude: number,
  horizonY: number,
): number {
  return horizonY + currentAltitude - altitude;
}

export function buildEpicBackgroundPlacements(
  epic: EpicBackgroundPatternInput,
): EpicBackgroundPatternPlacement[] {
  if (!epic.backgroundImage) {
    return [];
  }

  const config = normalizeBackgroundPatternConfig(epic.backgroundPatternConfig) ?? DEFAULT_CONFIG;

  const usableStart = epic.startPoint + EPIC_BACKGROUND_PATTERN_TOP_PADDING;
  const usableEnd = epic.endPoint - EPIC_BACKGROUND_PATTERN_BOTTOM_PADDING;

  if (usableEnd <= usableStart) {
    return [];
  }

  const { minGap, maxGap } = altitudeGapRange(config.density);
  const random = createRng(hashString(epic.id));
  const placements: EpicBackgroundPatternPlacement[] = [];

  let altitude = usableStart - minGap * 0.5;
  let index = 0;

  while (altitude < usableEnd) {
    altitude += lerp(minGap, maxGap, random());

    if (altitude >= usableEnd) {
      break;
    }

    placements.push({
      alpha: lerp(0.18, 0.34, random()),
      altitude,
      id: `${epic.id}:${index}`,
      rotation: lerp(-0.16, 0.16, random()),
      scale: lerp(config.minScale, config.maxScale, random()),
      xRatio: lerp(config.minXRatio, config.maxXRatio, random()),
    });

    index += 1;
  }

  if (placements.length === 0) {
    placements.push({
      alpha: 0.24,
      altitude: (usableStart + usableEnd) / 2,
      id: `${epic.id}:0`,
      rotation: 0,
      scale: lerp(config.minScale, config.maxScale, 0.5),
      xRatio: lerp(config.minXRatio, config.maxXRatio, 0.5),
    });
  }

  return placements;
}
