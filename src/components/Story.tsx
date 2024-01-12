import React from 'react'
import { iStoryEntity } from '../types/story.interface'

type Props = {
  naturalScrollPosition: number,
  story: iStoryEntity,
}

const Story: React.FC<Props> = ({
  naturalScrollPosition,
  story: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
  const topPosition = naturalScrollPosition - startPoint;

  return (
    <div
    className="relative max-w-100 top-0 left-0 m-4 bg-teal-500 p-5 text-white rounded-md"
    style={{ top: topPosition }}
  >
    <p className="font-bold text-3xl">{title}</p>
    <p>{description}</p>
  </div>
  )
}

export default Story
