import React, { useEffect, useState } from "react";
import { useFetchStoriesQuery } from "./store/storyAPI";
import MainWrapper from "./components/MainWrapper";

export const App = () => {
  const scroll: number = 2900; 
  const [scrollAmount, setScrollAmount] = useState(0);
  const { data, error, isLoading } = useFetchStoriesQuery(scroll);

  const handleScroll = (event: WheelEvent) => {
    event.preventDefault();
    const deltaY = event.deltaY < 0 ? Math.abs(event.deltaY) : event.deltaY * -1;

    setScrollAmount((prev) => prev + deltaY > 0 ? prev + deltaY : 0);
  };

  useEffect(() => {
    document.addEventListener('wheel', handleScroll, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleScroll);
    };
  }, []);

  console.log('error: ', error)
  console.log('data: ', data)
  console.log('loading: ', isLoading)
  console.log('scroll: ', scrollAmount);

  return (
    <MainWrapper />
  )

};
