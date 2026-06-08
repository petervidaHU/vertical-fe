import { describe, expect, it } from "@jest/globals";
import {
  getScrollDirection,
  getStoryStopAltitude,
  hasReachedPendingStoryStop,
  resolveNextStoryAwareTarget,
  type PendingStoryStop,
} from "./storyStops";

describe("storyStops", () => {
  it("returns the correct scroll direction", () => {
    expect(getScrollDirection(100, 200)).toBe(1);
    expect(getScrollDirection(200, 100)).toBe(-1);
    expect(getScrollDirection(200, 200)).toBe(0);
  });

  it("uses story start for upward stops and effective end for downward stops", () => {
    const story = { id: "story", startPoint: 1000, endPoint: 1002 };

    expect(getStoryStopAltitude(story, 1)).toBe(1000);
    expect(getStoryStopAltitude(story, -1)).toBe(1480);
  });

  it("clamps an upward paced jump to the nearest skipped story", () => {
    const result = resolveNextStoryAwareTarget({
      currentAltitude: 0,
      proposedTargetAltitude: 1800,
      renderedAltitude: 0,
      pendingStop: null,
      stories: [
        { id: "first", startPoint: 400, endPoint: 520 },
        { id: "second", startPoint: 1200, endPoint: 1300 },
      ],
    });

    expect(result).toEqual({
      nextTargetAltitude: 400,
      pendingStop: { storyId: "first", direction: 1, altitude: 400 },
      didClamp: true,
    });
  });

  it("clamps a downward paced jump to the nearest skipped story end checkpoint", () => {
    const result = resolveNextStoryAwareTarget({
      currentAltitude: 2400,
      proposedTargetAltitude: 0,
      renderedAltitude: 2400,
      pendingStop: null,
      stories: [
        { id: "upper", startPoint: 1600, endPoint: 1680 },
        { id: "lower", startPoint: 900, endPoint: 1000 },
      ],
    });

    expect(result).toEqual({
      nextTargetAltitude: 2080,
      pendingStop: { storyId: "upper", direction: -1, altitude: 2080 },
      didClamp: true,
    });
  });

  it("keeps a pending stop pinned until the rendered altitude reaches it", () => {
    const pendingStop: PendingStoryStop = {
      storyId: "first",
      direction: 1,
      altitude: 400,
    };

    const result = resolveNextStoryAwareTarget({
      currentAltitude: 250,
      proposedTargetAltitude: 1400,
      renderedAltitude: 250,
      pendingStop,
      stories: [
        { id: "first", startPoint: 400, endPoint: 520 },
        { id: "second", startPoint: 1200, endPoint: 1300 },
      ],
    });

    expect(result).toEqual({
      nextTargetAltitude: 400,
      pendingStop,
      didClamp: true,
    });
  });

  it("clears a reached pending stop and resolves the next skipped story", () => {
    const result = resolveNextStoryAwareTarget({
      currentAltitude: 400,
      proposedTargetAltitude: 1800,
      renderedAltitude: 400,
      pendingStop: {
        storyId: "first",
        direction: 1,
        altitude: 400,
      },
      stories: [
        { id: "first", startPoint: 400, endPoint: 520 },
        { id: "second", startPoint: 1200, endPoint: 1300 },
      ],
    });

    expect(result).toEqual({
      nextTargetAltitude: 1200,
      pendingStop: { storyId: "second", direction: 1, altitude: 1200 },
      didClamp: true,
    });
  });

  it("clears the pending stop when direction reverses", () => {
    const result = resolveNextStoryAwareTarget({
      currentAltitude: 250,
      proposedTargetAltitude: 0,
      renderedAltitude: 250,
      pendingStop: {
        storyId: "first",
        direction: 1,
        altitude: 400,
      },
      stories: [
        { id: "first", startPoint: 400, endPoint: 520 },
      ],
    });

    expect(result).toEqual({
      nextTargetAltitude: 0,
      pendingStop: null,
      didClamp: false,
    });
  });

  it("detects when a pending stop has been reached", () => {
    expect(hasReachedPendingStoryStop({ storyId: "a", direction: 1, altitude: 400 }, 400)).toBe(true);
    expect(hasReachedPendingStoryStop({ storyId: "a", direction: 1, altitude: 400 }, 399)).toBe(false);
    expect(hasReachedPendingStoryStop({ storyId: "a", direction: -1, altitude: 1480 }, 1480)).toBe(true);
    expect(hasReachedPendingStoryStop({ storyId: "a", direction: -1, altitude: 1480 }, 1481)).toBe(false);
  });

  it("uses the rendered altitude as the jump origin for the next stop", () => {
    const result = resolveNextStoryAwareTarget({
      currentAltitude: 200,
      proposedTargetAltitude: 1800,
      renderedAltitude: 200,
      pendingStop: null,
      stories: [
        { id: "first", startPoint: 400, endPoint: 520 },
        { id: "second", startPoint: 1200, endPoint: 1300 },
      ],
    });

    expect(result).toEqual({
      nextTargetAltitude: 400,
      pendingStop: { storyId: "first", direction: 1, altitude: 400 },
      didClamp: true,
    });
  });
});