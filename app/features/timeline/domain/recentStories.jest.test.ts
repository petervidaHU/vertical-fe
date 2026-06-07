import { describe, expect, it } from "@jest/globals";
import { getRecentPassedStories } from "./recentStories";

const stories = [
  { id: "a", storyType: "CARD", startPoint: 0, endPoint: 100 },
  { id: "b", storyType: "LINE", startPoint: 120, endPoint: 220 },
  { id: "c", storyType: "CARD", startPoint: 240, endPoint: 340 },
  { id: "d", storyType: "LINE", startPoint: 360, endPoint: 460 },
  { id: "e", storyType: "CARD", startPoint: 480, endPoint: 580 },
  { id: "f", storyType: "LINE", startPoint: 600, endPoint: 700 },
  { id: "g", storyType: "CARD", startPoint: 720, endPoint: 820 },
  { id: "h", storyType: "LINE", startPoint: 840, endPoint: 940 },
  { id: "i", storyType: "CARD", startPoint: 960, endPoint: 1060 },
  { id: "j", storyType: "LINE", startPoint: 1080, endPoint: 1180 },
  { id: "k", storyType: "CARD", startPoint: 1200, endPoint: 1300 },
];

describe("getRecentPassedStories", () => {
  it("returns the 10 most recently passed stories in descending endPoint order", () => {
    const result = getRecentPassedStories(stories, 2200, 10);

    expect(result).toHaveLength(10);
    expect(result.map((story) => story.id)).toEqual(["k", "j", "i", "h", "g", "f", "e", "d", "c", "b"]);
  });

  it("removes stories from the recent list when altitude moves back below their end point", () => {
    const result = getRecentPassedStories(stories, 900, 10);

    expect(result.map((story) => story.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("keeps short-lived line stories out of the recent list until their minimum active span is passed", () => {
    const shortLineStories = [
      { id: "line-short", storyType: "LINE", startPoint: 100, endPoint: 102 },
    ];

    expect(getRecentPassedStories(shortLineStories, 400, 10)).toEqual([]);
    expect(getRecentPassedStories(shortLineStories, 700, 10).map((story) => story.id)).toEqual(["line-short"]);
  });
});