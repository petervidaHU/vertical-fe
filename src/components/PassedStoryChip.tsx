import { iStoryEntity } from '@type/story.interface'
import React from 'react'

interface Props {
  story: iStoryEntity,
}

const PassedStoryChip: React.FC<Props> = ({
  story,
}) => {
  const displayName = story.title.length > 10? story.title.substring(0, 10) + '...' : story.title;
// TODO: interactivity with chips
  return (
    <div 
    className="flex items-center justify-center text-sm px-2 py-1 m-1 rounded-md bg-teal-500 text-white"
  >
    <p>{displayName}</p>
  </div>
  )
}

export default PassedStoryChip