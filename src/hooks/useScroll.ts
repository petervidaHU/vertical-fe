import { useEffect, useCallback } from "react";
import { useLazyFetchStoriesQuery } from "../API/storyAPI";
import { useDispatch, useSelector } from 'react-redux';
import { setScroll, setNaturalScroll, selectScroll, selectNaturalScroll } from './../store/scrollSlice';
import { selectPace } from "../store/paceSlice";

export const useScroll = () => {
  const dispatch = useDispatch();
  const scrollAmount = useSelector(selectScroll);
  const pace = useSelector(selectPace);
  const naturalScroll = useSelector(selectNaturalScroll)

  const [triggerFetch, { data = [], error, isLoading }] = useLazyFetchStoriesQuery();

  const handleScroll = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const deltaY = -event.deltaY;
    const movement = deltaY * pace + scrollAmount;
    const naturalMovement = deltaY + naturalScroll;

    dispatch(setNaturalScroll(naturalMovement > 0 ? naturalMovement : 0))
    dispatch(setScroll((movement > 0 ? movement : 0)));

    if (data.filter(story => story.startPoint > scrollAmount).length < 3) {
      console.log('fetch triggered ', scrollAmount)
      triggerFetch(scrollAmount);
    }

  }, [scrollAmount, dispatch, data.length, triggerFetch]);

  useEffect(() => {
    document.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleScroll);
    };
  }, [handleScroll]);

  return { data, error, isLoading };
}