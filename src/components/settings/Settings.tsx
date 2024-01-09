import React, { useState } from 'react'
import { Box } from '@chakra-ui/react';
import Pace from './Pace';
import { zIndex } from '../../style/zIndex';

const Settings = () => {
  const [showPace, setShowPace] = useState(false);

  return (<>
    <Box
      onMouseEnter={() => setShowPace(true)}
      onMouseLeave={() => setShowPace(false)}
      position="relative"
      zIndex={zIndex.settings}
    >
      <Box
        position="absolute"
        height="100px"
        top={showPace ? "0" : "-100px"}
        left="0"
        right="0"
        transition="top 0.5s"
        bg="blue.700"
        mt={0}
        px={4}
        py={2}
        color="white"
        borderBottomRadius="md"
        boxShadow="md"
        >
        <Pace />
      </Box>

      <Box
        position="absolute"
        top={showPace ? "100px" : "0"}
        left="50%"
        transition="top 0.5s"
        transform="translateX(-50%)"
        bg="blue.700"
        color="white"
        p={4}
        borderBottomRadius="md"
        boxShadow="md"
      >
        Pace
      </Box>

    </Box>
  </>
  )
}

export default Settings;
