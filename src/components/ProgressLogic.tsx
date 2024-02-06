import React from 'react';
import { getWindowHeight } from '@store/settingSlice';
import { useSelector, useDispatch } from 'react-redux';
import { getScroll, setLastId } from '@store/scrollSlice';
import { useGetTimelineQuery } from '../API/storyAPI';
import ProgressBar from './ProgressBar';

const MARGIN = 40;

const ProgressLogic = () => {
  const dispatch = useDispatch();
  const heightStored = useSelector(getWindowHeight);
  const height = heightStored - MARGIN;
  const scroll = useSelector(getScroll);
  const { data, error, isLoading } = useGetTimelineQuery();

  
  if (error) return <div>Error, no timeline :\</div>;
  if (isLoading) return <div>Loading timeline</div>;
  
  const { epics, last: { endOfTheWorld, lastId } } = data;
  if (lastId) {dispatch(setLastId(lastId))}

  const progressPercentage = scroll > 0 ?
    height - (height * scroll / endOfTheWorld)
    : height;

    return (
    <svg className="mt-5 mb-5" width="50" height={height}>
      <ProgressBar epics={epics} end={endOfTheWorld} height={height} />
      <rect
        y={progressPercentage}
        x="5"
        width="20"
        height="5"
        fill="red"
      />
    </svg>
  );
};



export default ProgressLogic;