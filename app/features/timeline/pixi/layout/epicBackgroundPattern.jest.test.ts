import { describe, expect, it } from "@jest/globals";
import {
  EPIC_BACKGROUND_PATTERN_BOTTOM_PADDING,
  EPIC_BACKGROUND_PATTERN_TOP_PADDING,
  altitudeToScreenY,
  buildEpicBackgroundPlacements,
  normalizeBackgroundPatternConfig,
} from "./epicBackgroundPattern";

const epic = {
  backgroundImage: "/uploads/epics/clouds.svg",
  endPoint: 760,
  id: "epic-clouds",
  startPoint: 120,
};

describe("epicBackgroundPattern", () => {
  it("builds deterministic placements for the same epic", () => {
    const first = buildEpicBackgroundPlacements(epic);
    const second = buildEpicBackgroundPlacements(epic);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("keeps placements inside the epic span with padding", () => {
    const placements = buildEpicBackgroundPlacements(epic);

    expect(
      placements.every((placement) => (
        placement.altitude >= epic.startPoint + EPIC_BACKGROUND_PATTERN_TOP_PADDING
        && placement.altitude <= epic.endPoint - EPIC_BACKGROUND_PATTERN_BOTTOM_PADDING
      )),
    ).toBe(true);
  });

  it("maps altitude to the same downward screen motion used by the timeline", () => {
    const altitude = 320;
    const horizonY = 200;

    const earlyY = altitudeToScreenY(altitude, 150, horizonY);
    const laterY = altitudeToScreenY(altitude, 250, horizonY);

    expect(laterY).toBeGreaterThan(earlyY);
  });

  it("skips placement generation when no image is configured", () => {
    expect(buildEpicBackgroundPlacements({ ...epic, backgroundImage: null })).toEqual([]);
  });

  it("applies density, scale, and spread overrides", () => {
    const sparsePlacements = buildEpicBackgroundPlacements({
      ...epic,
      backgroundPatternConfig: {
        density: 0,
        minScale: 0.25,
        maxScale: 0.4,
        minXRatio: 0.2,
        maxXRatio: 0.3,
      },
    });
    const densePlacements = buildEpicBackgroundPlacements({
      ...epic,
      backgroundPatternConfig: {
        density: 1,
        minScale: 0.25,
        maxScale: 0.4,
        minXRatio: 0.2,
        maxXRatio: 0.3,
      },
    });

    expect(densePlacements.length).toBeGreaterThan(sparsePlacements.length);
    expect(densePlacements.every((placement) => placement.scale >= 0.25 && placement.scale <= 0.4)).toBe(true);
    expect(densePlacements.every((placement) => placement.xRatio >= 0.2 && placement.xRatio <= 0.3)).toBe(true);
  });

  it("normalizes stringified configs and clamps imported values", () => {
    expect(normalizeBackgroundPatternConfig(JSON.stringify({ density: 0.75, minScale: 0.4 }))).toEqual({
      density: 0.75,
      minScale: 0.4,
      maxScale: 1.2,
      minXRatio: 0.12,
      maxXRatio: 0.88,
    });

    expect(normalizeBackgroundPatternConfig({
      density: 9,
      minScale: -3,
      maxScale: 7,
      minXRatio: -1,
      maxXRatio: 2,
    })).toEqual({
      density: 1,
      minScale: 0.1,
      maxScale: 3,
      minXRatio: 0,
      maxXRatio: 1,
    });
  });
});
