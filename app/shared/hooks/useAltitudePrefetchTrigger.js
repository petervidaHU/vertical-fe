import { useCallback } from 'react';
export const useAltitudePrefetchTrigger = ({ stories, epics, lastId, minAhead = 3, getStoryStartPoint, getEpicStartPoint, getStoryId, }) => {
    return useCallback((nextAltitude) => {
        const storiesAhead = stories.filter((story) => getStoryStartPoint(story) > nextAltitude).length;
        const epicsAhead = epics.filter((epic) => getEpicStartPoint(epic) > nextAltitude).length;
        const lastStoryIsLoaded = lastId ? stories.some((story) => getStoryId(story) === lastId) : false;
        if (nextAltitude === 0) {
            return true;
        }
        return (storiesAhead < minAhead || epicsAhead < minAhead) && !lastStoryIsLoaded;
    }, [epics, getEpicStartPoint, getStoryId, getStoryStartPoint, lastId, minAhead, stories]);
};
