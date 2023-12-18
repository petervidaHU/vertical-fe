import { useState, useEffect, useCallback } from "react";
import { useFetchStoriesQuery } from "../store/storyAPI";
import { useDispatch, useSelector } from 'react-redux';
import { setScroll, selectScroll } from './../store/scrollSlice';

export const useScroll = () => {
  const dispatch = useDispatch();
  const scrollAmount = useSelector(selectScroll);
  const { data, error, isLoading } = useFetchStoriesQuery(scrollAmount);
  
  const handleScroll = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const deltaY = event.deltaY < 0 ? Math.abs(event.deltaY) : event.deltaY * -1;

    dispatch(setScroll((scrollAmount + deltaY > 0 ? scrollAmount + deltaY : 0)));
  }, [scrollAmount, dispatch]);

  useEffect(() => {
    document.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleScroll);
    };
  }, [handleScroll]);

  /*   console.log('error: ', error)
    console.log('data: ', data)
    console.log('loading: ', isLoading)
    console.log('scroll: ', scrollAmount);
   */
  return { data, error, isLoading, scrollAmount };
}