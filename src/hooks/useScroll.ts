import { useCallback } from "react";
import { useLazyFetchStoriesQuery } from "../API/storyAPI";
import { useDispatch, useSelector } from 'react-redux';
import { setScroll, setNaturalScroll, getScroll, getNaturalScroll, getLastId } from './../store/scrollSlice';
import { selectPace } from "../store/paceSlice";
import { StoriesResponse } from "../API/apiTypes";
import { useWheelAltitude } from '../../app/shared/hooks/useWheelAltitude';
import { useAltitudePrefetchTrigger } from '../../app/shared/hooks/useAltitudePrefetchTrigger';

const initialState: StoriesResponse = {
  stories: [],
  epics: [],
}

export const useScroll = () => {
  const dispatch = useDispatch();
  const scrollAmount = useSelector(getScroll);
  const pace = useSelector(selectPace);
  const naturalScroll = useSelector(getNaturalScroll)
  const lastId = useSelector(getLastId);

  const [triggerFetch, { data = initialState, error, isLoading }] = useLazyFetchStoriesQuery();

  const shouldPrefetch = useAltitudePrefetchTrigger({
    stories: data.stories,
    epics: data.epics,
    lastId,
    minAhead: 3,
    getStoryStartPoint: (story) => story.startPoint,
    getEpicStartPoint: (story) => story.startPoint,
    getStoryId: (story) => story.id,
  });

  const handleAltitudeChange = useCallback(({ nextScaled, nextNatural }: { nextScaled: number, nextNatural: number }) => {
    dispatch(setNaturalScroll(nextNatural));
    dispatch(setScroll(nextScaled));

    if (shouldPrefetch(nextScaled)) {
      triggerFetch(nextScaled);
    }
  }, [dispatch, shouldPrefetch, triggerFetch]);

  useWheelAltitude({
    pace,
    scaledValue: scrollAmount,
    naturalValue: naturalScroll,
    onChange: handleAltitudeChange,
  });

  const { stories, epics } = data;

  return { stories, epics, error, isLoading };
}