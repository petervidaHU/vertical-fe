import { describe, expect, it } from "@jest/globals";
import { getCardPresentation, getEffectiveStoryEndPoint, getLinePresentation, getStoryVisibilityBand } from "./storyPresentation";

const story = {
  startPoint: 400,
  endPoint: 520,
};

describe("storyPresentation", () => {
  it("returns a deterministic visibility band", () => {
    const band = getStoryVisibilityBand(story);

    expect(band.entryStart).toBeLessThan(story.startPoint);
    expect(band.activeEnd).toBeGreaterThan(story.endPoint);
    expect(band.exitEnd).toBeGreaterThan(band.activeEnd);
  });

  it("moves through entering, active, exiting, and hidden phases from altitude alone", () => {
    const band = getStoryVisibilityBand(story);

    const entering = getCardPresentation({
      story,
      altitude: story.startPoint - 10,
      topDockY: 72,
      bottomDockY: 320,
      rendererHeight: 600,
      offscreenDistance: 124,
    });

    const active = getCardPresentation({
      story,
      altitude: 460,
      topDockY: 72,
      bottomDockY: 320,
      rendererHeight: 600,
      offscreenDistance: 124,
    });

    const exiting = getCardPresentation({
      story,
      altitude: band.activeEnd + 10,
      topDockY: 72,
      bottomDockY: 320,
      rendererHeight: 600,
      offscreenDistance: 124,
    });

    const hiddenAfter = getCardPresentation({
      story,
      altitude: band.exitEnd + 1,
      topDockY: 72,
      bottomDockY: 320,
      rendererHeight: 600,
      offscreenDistance: 124,
    });

    expect(entering.phase).toBe("entering");
    expect(entering.visible).toBe(true);
    expect(active.phase).toBe("active");
    expect(active.alpha).toBeCloseTo(0.96, 5);
    expect(exiting.phase).toBe("exiting");
    expect(exiting.visible).toBe(true);
    expect(hiddenAfter.phase).toBe("hidden-after");
    expect(hiddenAfter.visible).toBe(false);
  });

  it("extends short stories to a minimum active span", () => {
    const shortStory = {
      startPoint: 100,
      endPoint: 102,
    };

    expect(getEffectiveStoryEndPoint(shortStory)).toBe(580);
  });

  it("moves line stories downward on the screen during their active phase", () => {
    const lineStory = {
      startPoint: 300,
      endPoint: 302,
    };

    const early = getLinePresentation({
      story: lineStory,
      altitude: 320,
      topY: 140,
      bottomY: 420,
      rendererHeight: 700,
      offscreenDistance: 80,
    });

    const later = getLinePresentation({
      story: lineStory,
      altitude: 520,
      topY: 140,
      bottomY: 420,
      rendererHeight: 700,
      offscreenDistance: 80,
    });

    expect(early.visible).toBe(true);
    expect(later.visible).toBe(true);
    expect(later.y).toBeGreaterThan(early.y);
  });
});