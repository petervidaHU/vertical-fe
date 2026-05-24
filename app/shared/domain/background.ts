export type BackgroundMode = "color" | "gradient";

export type GradientStop = {
  color: string;
  percentage: number;
};

export type BackgroundValue =
  | {
    mode: "color";
    color: string;
  }
  | {
    mode: "gradient";
    stops: GradientStop[];
  };

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeColor(value: string): string {
  return value.trim();
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value.trim());
}

function normalizeStops(stops: GradientStop[]): GradientStop[] {
  return stops
    .map((stop) => ({
      color: normalizeColor(stop.color),
      percentage: clampPercentage(stop.percentage),
    }))
    .sort((a, b) => a.percentage - b.percentage);
}

export function defaultColorBackground(color: string): BackgroundValue {
  return {
    mode: "color",
    color: isHexColor(color) ? normalizeColor(color) : "#4ecdc4",
  };
}

export function getDefaultGradientFromColor(color: string): BackgroundValue {
  const safeColor = isHexColor(color) ? normalizeColor(color) : "#4ecdc4";
  return {
    mode: "gradient",
    stops: [
      { color: safeColor, percentage: 0 },
      { color: "#0c1626", percentage: 100 },
    ],
  };
}

export function backgroundToCss(background: BackgroundValue): string {
  if (background.mode === "color") {
    return background.color;
  }

  const stops = normalizeStops(background.stops)
    .map((stop) => `${stop.color} ${Math.round(stop.percentage)}%`)
    .join(", ");

  return `linear-gradient(90deg, ${stops})`;
}

export function primaryColorFromBackground(background: BackgroundValue): string {
  if (background.mode === "color") {
    return background.color;
  }

  const [firstStop] = normalizeStops(background.stops);
  return firstStop?.color ?? "#4ecdc4";
}

export function serializeBackground(background: BackgroundValue): string {
  if (background.mode === "color") {
    return JSON.stringify({
      mode: "color",
      color: normalizeColor(background.color),
    });
  }

  return JSON.stringify({
    mode: "gradient",
    stops: normalizeStops(background.stops),
  });
}

export function tryParseBackgroundInput(value: string): { background?: BackgroundValue; error?: string } {
  const raw = value.trim();

  if (!raw) {
    return { error: "Background is required." };
  }

  if (isHexColor(raw)) {
    return { background: { mode: "color", color: normalizeColor(raw) } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Background must be a color or gradient definition." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { error: "Invalid background format." };
  }

  const mode = (parsed as { mode?: unknown }).mode;

  if (mode === "color") {
    const color = (parsed as { color?: unknown }).color;
    if (typeof color !== "string" || !isHexColor(color)) {
      return { error: "Color background must be a valid hex color." };
    }

    return {
      background: {
        mode: "color",
        color: normalizeColor(color),
      },
    };
  }

  if (mode === "gradient") {
    const stops = (parsed as { stops?: unknown }).stops;

    if (!Array.isArray(stops) || stops.length < 2) {
      return { error: "Gradient background requires at least two stops." };
    }

    const normalized: GradientStop[] = [];

    for (const stop of stops) {
      if (typeof stop !== "object" || stop === null) {
        return { error: "Each gradient stop must include a color and percentage." };
      }

      const color = (stop as { color?: unknown }).color;
      const percentage = (stop as { percentage?: unknown }).percentage;

      if (typeof color !== "string" || !isHexColor(color)) {
        return { error: "Each gradient stop must use a valid hex color." };
      }

      const numericPercentage = typeof percentage === "number"
        ? percentage
        : Number.parseFloat(String(percentage));

      if (!Number.isFinite(numericPercentage)) {
        return { error: "Each gradient stop must use a valid percentage." };
      }

      normalized.push({
        color: normalizeColor(color),
        percentage: clampPercentage(numericPercentage),
      });
    }

    return {
      background: {
        mode: "gradient",
        stops: normalizeStops(normalized),
      },
    };
  }

  return { error: "Background mode must be color or gradient." };
}

export function parseStoredBackground(value: string | null | undefined, fallbackColor: string): BackgroundValue {
  if (!value) {
    return defaultColorBackground(fallbackColor);
  }

  const parsed = tryParseBackgroundInput(value);
  if (parsed.background) {
    return parsed.background;
  }

  return defaultColorBackground(fallbackColor);
}
