import { describe, expect, it } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { useAltitudePrefetchTrigger } from "./useAltitudePrefetchTrigger";

type Story = { id: string; startPoint: number };
type Epic = { startPoint: number };

describe("useAltitudePrefetchTrigger", () => {
  const baseStories: Story[] = [
    { id: "s1", startPoint: 100 },
    { id: "s2", startPoint: 200 },
  ];

  const baseEpics: Epic[] = [
    { startPoint: 150 },
    { startPoint: 250 },
  ];

  it("always prefetches at altitude 0", () => {
    const { result } = renderHook(() =>
      useAltitudePrefetchTrigger<Story, Epic>({
        stories: baseStories,
        epics: baseEpics,
        lastId: null,
        getStoryStartPoint: (story) => story.startPoint,
        getEpicStartPoint: (epic) => epic.startPoint,
        getStoryId: (story) => story.id,
      }),
    );

    expect(result.current(0)).toBe(true);
  });

  it("returns false when enough items ahead and last story loaded", () => {
    const { result } = renderHook(() =>
      useAltitudePrefetchTrigger<Story, Epic>({
        stories: [...baseStories, { id: "last", startPoint: 300 }],
        epics: [...baseEpics, { startPoint: 350 }],
        lastId: "last",
        minAhead: 1,
        getStoryStartPoint: (story) => story.startPoint,
        getEpicStartPoint: (epic) => epic.startPoint,
        getStoryId: (story) => story.id,
      }),
    );

    expect(result.current(120)).toBe(false);
  });

  it("returns true when story/epic items ahead drop below threshold", () => {
    const { result } = renderHook(() =>
      useAltitudePrefetchTrigger<Story, Epic>({
        stories: baseStories,
        epics: baseEpics,
        lastId: null,
        minAhead: 3,
        getStoryStartPoint: (story) => story.startPoint,
        getEpicStartPoint: (epic) => epic.startPoint,
        getStoryId: (story) => story.id,
      }),
    );

    expect(result.current(180)).toBe(true);
  });
});
