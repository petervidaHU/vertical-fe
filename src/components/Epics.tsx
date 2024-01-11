import { iStoryEntity } from '@type/story.interface'
import React from 'react'
import Epic from './Epic'
import { Box, Flex } from '@chakra-ui/react'
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
    <Box
      mt={{ base: 4, md: 0 }}
    >
      <Flex
        wrap="wrap"
      >
        {passedStories.map(story => (
          <PassedStoryChip
            story={story}
            key={story.id}
          />
        ))}
      </Flex>

      {epics.map(epic => (
        <Epic
          scrollPosition={scrollPosition}
          key={epic.id}
          epic={epic}
        />
      ))}
    </Box>
  )
}

export default Epics