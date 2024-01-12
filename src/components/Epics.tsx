import { iStoryEntity } from '@type/story.interface'
import React from 'react'
import Epic from './Epic'
import PassedStoryChip from './PassedStoryChip'
import { useSelector } from 'react-redux'
import { getPassedStories } from '@store/storiesSlice'

interface Props {
  epics: Array<iStoryEntity>,
  scrollPosition: number
}

const Epics: React.FC<Props> = ({
  epics,
  scrollPosition
}) => {
  const passedStories = useSelector(getPassedStories) 

  return (
    <div className="mt-4 md:mt-0">
    <div className="flex-wrap flex">
      {passedStories.map(story => (
        <PassedStoryChip
          story={story}
          key={story.id}
        />
      ))}
    </div>
  
    {epics.map(epic => (
      <Epic
        scrollPosition={scrollPosition}
        key={epic.id}
        epic={epic}
      />
    ))}
  </div>
  )
}

export default Epics