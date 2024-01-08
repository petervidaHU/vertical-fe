import React, { useState } from 'react'
import styled from '@emotion/styled'
import { Box } from '@chakra-ui/react';
import Pace from './Pace';

const Settings = () => {
  const [showPace, setShowPace] = useState(false);

  return (<>
    <Box
      onMouseEnter={() => setShowPace(true)}
      onMouseLeave={() => setShowPace(false)}
      zIndex="100"
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

const SettingContainer = styled.section`
position: absolute;
top: 0;
left: 0;
right: 0;
`

const SettingsTab = styled.div`
padding: 10px;
background: #ccc;

`