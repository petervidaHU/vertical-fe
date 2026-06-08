import { getEffectiveStoryEndPoint } from "../pixi/layout/storyPresentation";

export type ScrollDirection = -1 | 0 | 1;

export type StoryStopCandidate = {
  id: string;
  startPoint: number;
  endPoint: number;
};

export type PendingStoryStop = {
  storyId: string;
  direction: -1 | 1;
  altitude: number;
};

export type StoryStopResolution = {
  nextTargetAltitude: number;
  pendingStop: PendingStoryStop | null;
  didClamp: boolean;
};

type ResolveNextStoryAwareTargetOptions = {
  currentAltitude: number;
  proposedTargetAltitude: number;
  renderedAltitude: number;
  pendingStop: PendingStoryStop | null;
  stories: StoryStopCandidate[];
};

export function getScrollDirection(fromAltitude: number, toAltitude: number): ScrollDirection {
  if (toAltitude > fromAltitude) {
    return 1;
  }

  if (toAltitude < fromAltitude) {
    return -1;
  }

  return 0;
}

export function getStoryStopAltitude(story: StoryStopCandidate, direction: -1 | 1): number {
  return direction > 0 ? story.startPoint : getEffectiveStoryEndPoint(story);
}

export function hasReachedPendingStoryStop(pendingStop: PendingStoryStop, renderedAltitude: number): boolean {
  return pendingStop.direction > 0
    ? renderedAltitude >= pendingStop.altitude
    : renderedAltitude <= pendingStop.altitude;
}

export function resolveNextStoryAwareTarget({
  currentAltitude,
  proposedTargetAltitude,
  renderedAltitude,
  pendingStop,
  stories,
}: ResolveNextStoryAwareTargetOptions): StoryStopResolution {
  const direction = getScrollDirection(currentAltitude, proposedTargetAltitude);
  const activePendingStop = pendingStop && hasReachedPendingStoryStop(pendingStop, renderedAltitude)
    ? null
    : pendingStop;

  if (activePendingStop && (direction === 0 || direction === activePendingStop.direction)) {
    return {
      nextTargetAltitude: activePendingStop.altitude,
      pendingStop: activePendingStop,
      didClamp: true,
    };
  }

  if (direction === 0) {
    return {
      nextTargetAltitude: proposedTargetAltitude,
      pendingStop: null,
      didClamp: false,
    };
  }

  const nextStopCandidate = stories
    .map((story) => ({
      story,
      altitude: getStoryStopAltitude(story, direction),
    }))
    .filter(({ altitude }) => (
      direction > 0
        ? altitude > currentAltitude && altitude <= proposedTargetAltitude
        : altitude < currentAltitude && altitude >= proposedTargetAltitude
    ))
    .sort((left, right) => (
      direction > 0 ? left.altitude - right.altitude : right.altitude - left.altitude
    ))[0];

  if (!nextStopCandidate) {
    return {
      nextTargetAltitude: proposedTargetAltitude,
      pendingStop: null,
      didClamp: false,
    };
  }

  return {
    nextTargetAltitude: nextStopCandidate.altitude,
    pendingStop: {
      storyId: nextStopCandidate.story.id,
      direction,
      altitude: nextStopCandidate.altitude,
    },
    didClamp: true,
  };
}