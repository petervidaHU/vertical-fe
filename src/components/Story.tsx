import React from 'react'
import { iStoryEntity } from '../store/story.interface'

type StoryProps = {
  comp: iStoryEntity,
}

const Story: React.FC<StoryProps> = ({ comp }) => {
  return (
    <div key={comp.id}>
          <div>{comp.title}</div>
          <div>{comp.description}</div>
          <div>{comp.startPoint}</div>
          <div>{comp.endPoint}</div>
        </div>
  )
}

export default Story