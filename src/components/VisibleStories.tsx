import React from 'react'
import { iStoryEntity } from '@type/story.interface'
import { Box } from '@chakra-ui/react'
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
    <Box
      height={{ base: "100vh" }}
      width={{ base: "60vw" }}
    >
      {stories.map(story => (
        <Story
          naturalScrollPosition={pos}
          key={story.id}
          story={story}
        />
      ))}
    </Box>
  )
}

export default VisibleStories