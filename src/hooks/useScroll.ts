import { useEffect, useCallback } from "react";
import { useLazyFetchStoriesQuery } from "../API/storyAPI";
import { useDispatch, useSelector } from 'react-redux';
import { setScroll, setNaturalScroll, getScroll, getNaturalScroll } from './../store/scrollSlice';
import { selectPace } from "../store/paceSlice";
import { StoriesResponse } from "src/API/apiTypes";

const initialState: StoriesResponse = {
  stories: [],
  epics: [],
}

export const useScroll = () => {
  const dispatch = useDispatch();
  const scrollAmount = useSelector(getScroll);
  const pace = useSelector(selectPace);
  const naturalScroll = useSelector(getNaturalScroll)


  const [triggerFetch, { data = initialState, error, isLoading }] = useLazyFetchStoriesQuery();

  const handleScroll = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const deltaY = -event.deltaY;
    const movement = deltaY * pace + scrollAmount;
    const naturalMovement = deltaY + naturalScroll;

    dispatch(setNaturalScroll(naturalMovement > 0 ? naturalMovement : 0))
    dispatch(setScroll((movement > 0 ? movement : 0)));

    if (
      //TODO: refactor fetch logic: do not need last 10, if we know the direction, but caching?
      scrollAmount == 0 ||
      data.stories.filter(story => story.startPoint > scrollAmount).length < 3 ||
      data.epics.filter(story => story.startPoint > scrollAmount).length < 3
    ) {
      console.log("fetch triggered ", scrollAmount)
      triggerFetch(scrollAmount);
    }

  }, [scrollAmount, dispatch, data, triggerFetch]);

  useEffect(() => {
    document.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleScroll);
    };
  }, [handleScroll]);

  const { stories, epics } = data;

  return { stories, epics, error, isLoading };
}