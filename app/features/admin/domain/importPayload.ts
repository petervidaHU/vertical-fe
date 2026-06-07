import { normalizeAltitudeInfoIcon, rangesOverlap } from "../../altitude-info/domain/altitudeInfo";
import { normalizeBackgroundPatternConfig, type BackgroundPatternConfig } from "../../timeline/pixi/layout/epicBackgroundPattern";
import { normalizeTagName, TAG_SYSTEM_MAX_COUNT, validateTagName } from "../../tags/domain/tags";
import {
  defaultColorBackground,
  primaryColorFromBackground,
  serializeBackground,
  tryParseBackgroundInput,
} from "../../../shared/domain/background";

export type ParsedImportPayload = {
  altitudeInfos: Array<{
    title: string;
    icon: string;
    order: number;
    tags: string[];
    values: Array<{
      value: string;
      startPoint: number;
      endPoint: number;
    }>;
  }>;
  epics: Array<{
    title: string;
    startPoint: number;
    endPoint: number;
    background: string;
    backgroundImage: string | null;
    backgroundPatternConfig: BackgroundPatternConfig | null;
    color: string;
  }>;
  stories: Array<{
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
    tags: string[];
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumberField(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.trunc(numeric);
}

function parseBackgroundField(value: unknown, fallbackColor: string): { serialized: string; color: string } | { error: string } {
  if (value === undefined || value === null || value === "") {
    const fallback = defaultColorBackground(fallbackColor);
    return {
      serialized: serializeBackground(fallback),
      color: primaryColorFromBackground(fallback),
    };
  }

  const rawValue = typeof value === "string" ? value : JSON.stringify(value);
  const parsed = tryParseBackgroundInput(rawValue);

  if (!parsed.background) {
    return { error: parsed.error ?? "Invalid background format." };
  }

  return {
    serialized: serializeBackground(parsed.background),
    color: primaryColorFromBackground(parsed.background),
  };
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const name = normalizeTagName(String(raw[i] ?? ""));
    if (!name || seen.has(name)) {
      continue;
    }

    const validation = validateTagName(name);
    if (!validation.valid) {
      continue;
    }

    seen.add(name);
    result.push(name);

    if (result.length >= TAG_SYSTEM_MAX_COUNT) {
      break;
    }
  }

  return result;
}

export function normalizeImportPayload(payload: unknown): ParsedImportPayload {
  if (!isRecord(payload)) {
    throw new Error("JSON root must be an object with altitudeInfos, epics, and/or stories arrays.");
  }

  const rawAltitudeInfos = payload.altitudeInfos;
  const rawEpics = payload.epics;
  const rawStories = payload.stories;
  const altitudeInfos = Array.isArray(rawAltitudeInfos) ? rawAltitudeInfos : [];
  const epics = Array.isArray(rawEpics) ? rawEpics : [];
  const stories = Array.isArray(rawStories) ? rawStories : [];

  if (altitudeInfos.length === 0 && epics.length === 0 && stories.length === 0) {
    throw new Error("Provide at least one altitude info series, epic, or story in the JSON payload.");
  }

  const parsedAltitudeInfos = altitudeInfos.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Altitude info #${index + 1} must be an object.`);
    }

    const title = String(item.title ?? "").trim();
    const icon = normalizeAltitudeInfoIcon(String(item.icon ?? "info"));
    const order = parseNumberField(item.order ?? index * 10) ?? index * 10;
    const rawValues = Array.isArray(item.values) ? item.values : [];

    if (!title) {
      throw new Error(`Altitude info #${index + 1} requires a title.`);
    }

    if (rawValues.length === 0) {
      throw new Error(`Altitude info #${index + 1} requires at least one value band.`);
    }

    const values = rawValues
      .map((valueItem, valueIndex) => {
        if (!isRecord(valueItem)) {
          throw new Error(`Altitude info #${index + 1} value #${valueIndex + 1} must be an object.`);
        }

        const value = String(valueItem.value ?? "").trim();
        const startPoint = parseNumberField(valueItem.startPoint);
        const endPoint = parseNumberField(valueItem.endPoint);

        if (!value || startPoint === null || endPoint === null) {
          throw new Error(`Altitude info #${index + 1} value #${valueIndex + 1} requires value, startPoint, and endPoint.`);
        }

        if (startPoint > endPoint) {
          throw new Error(`Altitude info #${index + 1} value #${valueIndex + 1} startPoint must be <= endPoint.`);
        }

        return {
          value,
          startPoint,
          endPoint,
        };
      })
      .sort((left, right) => left.startPoint - right.startPoint);

    for (let valueIndex = 1; valueIndex < values.length; valueIndex += 1) {
      if (rangesOverlap(values[valueIndex - 1], values[valueIndex])) {
        throw new Error(`Altitude info #${index + 1} has overlapping value bands.`);
      }
    }

    return {
      title,
      icon,
      order,
      tags: normalizeTags(item.tags),
      values,
    };
  });

  const parsedEpics = epics.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Epic #${index + 1} must be an object.`);
    }

    const title = String(item.title ?? "").trim();
    const backgroundImage = String(item.backgroundImage ?? "").trim() || null;
    const backgroundPatternConfigSource = item.backgroundPatternConfig;
    const backgroundPatternConfig = backgroundPatternConfigSource === undefined
      ? null
      : normalizeBackgroundPatternConfig(backgroundPatternConfigSource);
    const startPoint = parseNumberField(item.startPoint);
    const endPoint = parseNumberField(item.endPoint);

    if (!title || startPoint === null || endPoint === null) {
      throw new Error(`Epic #${index + 1} requires title, startPoint, and endPoint.`);
    }

    if (backgroundPatternConfigSource !== undefined && backgroundPatternConfig === null) {
      throw new Error(`Epic #${index + 1} backgroundPatternConfig is invalid.`);
    }

    if (startPoint > endPoint) {
      throw new Error(`Epic #${index + 1} startPoint must be <= endPoint.`);
    }

    const parsedBackground = parseBackgroundField(item.background, "#4ecdc4");
    if ("error" in parsedBackground) {
      throw new Error(`Epic #${index + 1} background is invalid: ${parsedBackground.error}`);
    }

    return {
      title,
      startPoint,
      endPoint,
      background: parsedBackground.serialized,
      backgroundImage,
      backgroundPatternConfig,
      color: parsedBackground.color,
    };
  });

  const parsedStories = stories.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Story #${index + 1} must be an object.`);
    }

    const title = String(item.title ?? "").trim();
    const description = String(item.description ?? "").trim();
    const extraContent = String(item.extraContent ?? "").trim();
    const rawStoryType = String(item.storyType ?? "CARD").trim().toUpperCase();
    const storyType: "CARD" | "LINE" = rawStoryType === "LINE" ? "LINE" : "CARD";

    const imageUrlRaw = String(item.imageUrl ?? "").trim();
    const tooltipImageUrlRaw = String(item.tooltipImageUrl ?? "").trim();
    const lineColor = String(item.lineColor ?? "#4ecdc4").trim() || "#4ecdc4";
    const lineLabel = String(item.lineLabel ?? "").trim();
    const tooltipText = String(item.tooltipText ?? "").trim();
    const startPoint = parseNumberField(item.startPoint);
    const endPoint = parseNumberField(item.endPoint);
    const lineWidth = parseNumberField(item.lineWidth ?? 4);

    if (!title || startPoint === null || endPoint === null) {
      throw new Error(`Story #${index + 1} requires title, startPoint, and endPoint.`);
    }

    if (startPoint > endPoint) {
      throw new Error(`Story #${index + 1} startPoint must be <= endPoint.`);
    }

    if (lineWidth === null || lineWidth < 1 || lineWidth > 64) {
      throw new Error(`Story #${index + 1} lineWidth must be between 1 and 64.`);
    }

    const parsedBackground = parseBackgroundField(item.background, "#ffd8a8");
    if ("error" in parsedBackground) {
      throw new Error(`Story #${index + 1} background is invalid: ${parsedBackground.error}`);
    }

    return {
      title,
      description,
      extraContent,
      storyType,
      background: parsedBackground.serialized,
      imageUrl: imageUrlRaw || null,
      lineColor,
      lineWidth,
      lineLabel,
      tooltipText,
      tooltipImageUrl: tooltipImageUrlRaw || null,
      startPoint,
      endPoint,
      tags: normalizeTags(item.tags),
    };
  });

  return {
    altitudeInfos: parsedAltitudeInfos,
    epics: parsedEpics,
    stories: parsedStories,
  };
}