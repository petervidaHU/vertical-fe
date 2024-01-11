import { iStoryEntity } from '@type/story.interface'
import React from 'react'
import Epic from './Epic'
import { Box, Flex } from '@chakra-ui/react'
import PassedStoryChip from './PassedStoryChip'

interface Props {
  epics: Array<iStoryEntity>,
  passedStories: Array<iStoryEntity>,
  scrollPosition: number
}

const Epics: React.FC<Props> = ({
  epics,
  passedStories,
  scrollPosition
}) => {
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