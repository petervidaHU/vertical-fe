import { Box, Text } from "@chakra-ui/react";
import { iStoryEntity } from "@type/story.interface";

type Props = {
  scrollPosition: number,
  epic: iStoryEntity,
}

const Epic: React.FC<Props> = ({
  scrollPosition,
  epic: {
    title,
    description,
    startPoint,
    endPoint
  }
}) => {
  return (
    <Box
      mb="100px"
      ml="auto"
      mr="100px"
      maxW="50vw"
      m={4}
      bg="teal.800"
      p={5}
      color="white"
      borderRadius="md"
    >
      <Text fontWeight="bold" fontSize="2rem">{title}</Text>
      <Text>{description}</Text>
      <Text>from: {startPoint}</Text>
      <Text>to: {endPoint}</Text>
    </Box>
  );
}

export default Epic;