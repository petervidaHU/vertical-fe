import React from 'react'
import { iStoryEntity } from '@type/story.interface'
import Story from './Story'

interface Props {
  pos: number,
  stories: Array<iStoryEntity>,
}

const VisibleStories: React.FC<Props> = ({
  stories,
  pos,
}) => {
  return (
    <div className="h-screen">
      {stories.map(story => (
        <Story
          naturalScrollPosition={pos}
          key={story.id}
          story={story}
        />
      ))}
    </div>
  )
}

export default VisibleStories