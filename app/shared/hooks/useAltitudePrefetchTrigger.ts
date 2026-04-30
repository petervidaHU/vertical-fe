import { useCallback } from 'react';

type UseAltitudePrefetchTriggerOptions<TStory, TEpic> = {
  stories: TStory[];
  epics: TEpic[];
  lastId: string | null;
  minAhead?: number;
  getStoryStartPoint: (story: TStory) => number;
  getEpicStartPoint: (epic: TEpic) => number;
  getStoryId: (story: TStory) => string;
};

export const useAltitudePrefetchTrigger = <TStory, TEpic>({
  stories,
  epics,
  lastId,
  minAhead = 3,
  getStoryStartPoint,
  getEpicStartPoint,
  getStoryId,
}: UseAltitudePrefetchTriggerOptions<TStory, TEpic>) => {
  return useCallback((nextAltitude: number) => {
    const storiesAhead = stories.filter((story) => getStoryStartPoint(story) > nextAltitude).length;
    const epicsAhead = epics.filter((epic) => getEpicStartPoint(epic) > nextAltitude).length;
    const lastStoryIsLoaded = lastId ? stories.some((story) => getStoryId(story) === lastId) : false;

    if (nextAltitude === 0) {
      return true;
    }

    return (storiesAhead < minAhead || epicsAhead < minAhead) && !lastStoryIsLoaded;
  }, [epics, getEpicStartPoint, getStoryId, getStoryStartPoint, lastId, minAhead, stories]);
};
