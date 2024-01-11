import React from 'react'
import PageTitle from './PageTitle'
import { Flex, Box } from "@chakra-ui/react";
import ScrollAmount from './ScrollAmount'
import Settings from './settings/Settings'
import { useScroll } from './../hooks/useScroll';
import { selectNaturalScroll, selectScroll } from '@store/scrollSlice';
import { useSelector } from 'react-redux';
import VisibleStories from './VisibleStories';
import Epics from './Epics';

const MainWrapper = () => {
  // TODO: timeline visualization
  // TODO: set an event listener to handle resize
  const viewportHeight = window.innerHeight;

  // BUG: older stories not saved to passed strories array
  const { stories, epics, error, isLoading } = useScroll()
  const naturalScrollPosition = useSelector(selectNaturalScroll);
  const scrollPosition = useSelector(selectScroll);

  const storiesVisible = stories.filter(s => scrollPosition >= s.startPoint - 500 && scrollPosition <= s.startPoint + viewportHeight + 500)
  const epicsVisible = epics.filter(s => scrollPosition >= s.startPoint && scrollPosition <= s.endPoint)
  const storiesPassed = stories.filter(s => scrollPosition >= s.startPoint + viewportHeight - 100)

  if (error) {
    console.error('there is an error occured during prefetch records: ', error);
    return (<div>error, see console!</div>);
  }

  console.log('passed: ', storiesPassed)

  return (
    <Box
      bg="#0f0919"
      color="#ffffff"
      h="100vh"
      position="relative"
      overflow="hidden"
      zIndex="1"
    >
      <Settings />
      <PageTitle />
      <Flex
        direction="row"
        p={0}
      >

        <VisibleStories
          pos={naturalScrollPosition}
          stories={storiesVisible}
        />

        <Flex
          direction="column"
          p={4}
          justifyContent="space-between"
          width="40vw"
        >
          <ScrollAmount />

          <Epics
            epics={epicsVisible}
            passedStories={storiesPassed}
            scrollPosition={scrollPosition}
          />

        </Flex>
      </Flex>
    </Box>
  )
}

export default MainWrapper;