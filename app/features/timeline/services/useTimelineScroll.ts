import { useState, useCallback, useEffect, useRef } from 'react';
import { prefetchTimeline, getTimelineProgress } from '../../../shared/api/endpoints';
import { TimelineItem } from '../domain/types';
import { useWheelAltitude } from '../../../shared/hooks/useWheelAltitude';
import { useAltitudePrefetchTrigger } from '../../../shared/hooks/useAltitudePrefetchTrigger';

const VIEWPORT_BUFFER_PX = 100;
const DEFAULT_PACE = 1;

const mapDtoToItem = (dto: {
  id: string;
  type: 'story' | 'epic';
  title: string;
  description: string;
  startPoint: number;
  endPoint: number;
}): TimelineItem => ({ ...dto, type: dto.type as TimelineItem['type'] });

export const useTimelineScroll = () => {
  const [altitude, setAltitude] = useState(0);
  const [naturalAltitude, setNaturalAltitude] = useState(0);
  const [pace, setPace] = useState(DEFAULT_PACE);
  const [stories, setStories] = useState<TimelineItem[]>([]);
  const [epics, setEpics] = useState<TimelineItem[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [endOfTheWorld, setEndOfTheWorld] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInFlight = useRef(false);

  // Load world boundary once on mount so prefetch can stop at the right point
  useEffect(() => {
    getTimelineProgress()
      .then(({ last }) => {
        setLastId(last.lastId);
        setEndOfTheWorld(last.endOfTheWorld);
      })
      .catch(() => {
        // Non-fatal: prefetch heuristic still works; we simply keep fetching
        // until the stories buffer stays full.
      });
  }, []);

  const fetchAt = useCallback(async (atAltitude: number) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const data = await prefetchTimeline(atAltitude);
      setStories(data.stories.map(mapDtoToItem));
      setEpics(data.epics.map(mapDtoToItem));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setIsLoading(false);
      fetchInFlight.current = false;
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchAt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shouldPrefetch = useAltitudePrefetchTrigger({
    stories,
    epics,
    lastId,
    getStoryStartPoint: (s) => s.startPoint,
    getEpicStartPoint: (e) => e.startPoint,
    getStoryId: (s) => s.id,
  });

  const handleAltitudeChange = useCallback(
    ({ nextScaled, nextNatural }: { nextScaled: number; nextNatural: number }) => {
      setAltitude(nextScaled);
      setNaturalAltitude(nextNatural);
      if (shouldPrefetch(nextScaled)) {
        fetchAt(nextScaled);
      }
    },
    [fetchAt, shouldPrefetch],
  );

  useWheelAltitude({
    pace,
    scaledValue: altitude,
    naturalValue: naturalAltitude,
    onChange: handleAltitudeChange,
  });

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const storiesVisible = stories.filter(
    (s) =>
      altitude >= s.startPoint - VIEWPORT_BUFFER_PX &&
      altitude <= s.startPoint + viewportHeight + VIEWPORT_BUFFER_PX,
  );
  const epicsVisible = epics.filter(
    (e) => altitude >= e.startPoint && altitude <= e.endPoint,
  );

  return {
    altitude,
    naturalAltitude,
    pace,
    setPace,
    storiesVisible,
    epicsVisible,
    endOfTheWorld,
    isLoading,
    error,
  };
};
