import { getEffectiveStoryEndPoint } from "../pixi/layout/storyPresentation";

export type RecentStoryCandidate = {
  startPoint: number;
  endPoint: number;
};

export function getRecentPassedStories<T extends RecentStoryCandidate>(
  stories: T[],
  altitude: number,
  limit = 10,
): T[] {
  return stories
    .filter((story) => altitude > getEffectiveStoryEndPoint(story))
    .sort((left, right) => getEffectiveStoryEndPoint(right) - getEffectiveStoryEndPoint(left))
    .slice(0, limit);
}