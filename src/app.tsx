import React, { useEffect, useState } from "react";

export const App = () => {
  const [scrollAmount, setScrollAmount] = useState(0);
  
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

  console.log('scroll: ', scrollAmount);
  
  return (
    <h1>Hello from React!</h1>
  )

};
