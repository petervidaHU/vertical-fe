import { useEffect, useCallback } from "react";
import { useLazyFetchStoriesQuery } from "../API/storyAPI";
import { useDispatch, useSelector } from 'react-redux';
import { setScroll, selectScroll } from './../store/scrollSlice';

export const useScroll = () => {
  const dispatch = useDispatch();
  const scrollAmount = useSelector(selectScroll);
  const [triggerFetch, { data = [], error, isLoading }] = useLazyFetchStoriesQuery();
    
  const handleScroll = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const deltaY = event.deltaY < 0 ? Math.abs(event.deltaY) : event.deltaY * -1;
    dispatch(setScroll((scrollAmount + deltaY > 0 ? scrollAmount + deltaY : 0)));
    
    if(data.filter(story => story.startPoint > scrollAmount).length < 3) {
      triggerFetch(scrollAmount);
    }

  }, [scrollAmount, dispatch, data.length, triggerFetch]);

  useEffect(() => {
    document.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleScroll);
    };
  }, [handleScroll]);

  return { data, error, isLoading, scrollAmount };
}