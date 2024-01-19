import React from 'react';
import { getWindowHeight } from '@store/settingSlice';
import { useSelector } from 'react-redux';
import { getScroll } from '@store/scrollSlice';
import { useGetTimelineQuery } from '../API/storyAPI';
import ProgressBar from './ProgressBar';

const MARGIN = 40;

const ProgressLogic = () => {
  const heightStored = useSelector(getWindowHeight);
  const height = heightStored - MARGIN;
  const scroll = useSelector(getScroll);
  const { data, error, isLoading } = useGetTimelineQuery();

  // TODO: if (data.last) {dispatch(setLastId(data.last.lastId))}

  if (error) return <div>Error, no timelione :\</div>;
  if (isLoading) return <div>Loading timeline</div>;

  const { epics, last: { endOfTheWorld } } = data;

  const progressPercentage = scroll > 0 ?
    height - (height * scroll / endOfTheWorld)
    : height;

  return (
    <svg className="mt-5 mb-5" width="50" height={height}>
      <ProgressBar epics={epics} end={endOfTheWorld} height={height}/>
      <circle
        cx="15"
        cy={progressPercentage}
        r="10"
        fill="red"
      />
    </svg>
  );
};



export default ProgressLogic;