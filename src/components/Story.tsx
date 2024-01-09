import React from 'react'
import { iStoryEntity } from '../types/story.interface'
import { Box, Text } from "@chakra-ui/react";

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
    <Box position="absolute" top={topPosition} left="0" m={4} bg="teal.500" p={5} color="white" borderRadius="md">
      <Text fontWeight="bold" fontSize="2rem">{title}</Text>
      <Text>{description}</Text>
    </Box>
  )
}

export default Story
