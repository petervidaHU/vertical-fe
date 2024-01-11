import { Box, Text } from '@chakra-ui/react'
import { iStoryEntity } from '@type/story.interface'
import React from 'react'

interface Props {
  story: iStoryEntity,
}

const PassedStoryChip: React.FC<Props> = ({
  story,
}) => {
  const displayName = story.title.length > 10? story.title.substring(0, 10) + '...' : story.title;

  return (
    <Box
      alignItems="center"
      justifyContent="center"
      fontSize="sm"
      px={2}
      py={1}
      m={1}
      borderRadius="md"
      bg="teal.500"
      color="white" 
      >
      <Text>{displayName}</Text>
    </Box>
  )
}

export default PassedStoryChip