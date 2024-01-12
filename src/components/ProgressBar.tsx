import React from 'react';
import { getWindowHeight } from '@store/settingSlice';
import { useSelector } from 'react-redux';
import { useGetTimelineQuery } from '../API/storyAPI';
import { getScroll } from '@store/scrollSlice';

const ProgressBar = () => {
  const height = useSelector(getWindowHeight);
  const scroll = useSelector(getScroll);

  const { data, error, isLoading } = useGetTimelineQuery();

  // if (data.last) {dispatch(setLastId(data.last.lastId))}

  if (error) return <div>Error, no timelione :\</div>;
  if (isLoading) return <div>Loading timeline</div>;

  const progressPerecntage = scroll > 0 ?
    height - (height * scroll / data.last.endOfTheWorld)
    : height;

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
        cy={progressPerecntage}
        r="10"
        fill="red"
      />
    </svg>
  );
};

export default ProgressBar;