import React from 'react';
import { getWindowHeight } from '@store/settingSlice';
import { useSelector } from 'react-redux';
import { useGetTimelineQuery } from '../API/storyAPI';

const ProgressBar = ({ progress }) => {
  const { data, error, isLoading  } = useGetTimelineQuery();
  
  const height = useSelector(getWindowHeight);
  const dotY = height * ((100-progress) / 100);

  console.log('timeline data:', data)
  
  if (error) return <div>Error</div>;
  if (isLoading) return <div>Loading</div>;
  
  return (
    <svg width="50" height={height}>
      <rect
        x="10"
        y="10"
        width="10"
        height={height > 20 ? height - 20 : height}
        fill="lightgray"
      />
      <circle
        cx="15"
        cy={dotY}
        r="10"
        fill="red"
      />
    </svg>
  );
};

export default ProgressBar;