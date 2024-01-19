import { setScroll } from '@store/scrollSlice';
import { iStoryEntity } from '@type/story.interface'
import React from 'react'
import { useDispatch } from 'react-redux';

interface Props {
  story: iStoryEntity,
}

const PassedStoryChip: React.FC<Props> = ({
  story,
}) => {
  const dispatch = useDispatch();

  const displayName = story.title.length > 10? story.title.substring(0, 10) + '...' : story.title;

  const handleOnclick = () => {
    dispatch(setScroll(story.startPoint));
  }

  return (
    <div 
    onClick={handleOnclick}
    className="flex items-center justify-center text-sm px-2 py-1 m-1 rounded-md bg-teal-500 text-white cursor-pointer"
  >
    <p>{displayName}</p>
  </div>
  )
}

export default PassedStoryChip