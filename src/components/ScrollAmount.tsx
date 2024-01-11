import React from 'react'
import { useSelector } from 'react-redux';
import { selectScroll } from '@store/scrollSlice';
import { Box, Text } from '@chakra-ui/react';

const ScrollAmount: React.FC = () => {
  const scrollAmount = useSelector(selectScroll);
  return (
    <Box>
      <Text
        float="right"
        fontWeight="bold"
        fontSize="2rem"
      >
        height: {scrollAmount}
      </Text>
    </Box>
  )
}

export default ScrollAmount