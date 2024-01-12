import React from 'react'
import PageTitle from './PageTitle'
import { Flex, Box } from "@chakra-ui/react";
import ScrollAmount from './ScrollAmount'
import Settings from './settings/Settings'
import { useScroll } from './../hooks/useScroll';
import { selectNaturalScroll, selectScroll } from '@store/scrollSlice';
import { useDispatch, useSelector } from 'react-redux';
import VisibleStories from './VisibleStories';
import Epics from './Epics';
import { getPassedStoriesIds, setPassedStories } from '@store/storiesSlice';
import ProgressBar from './ProgressBar';
import { getWindowHeight } from '@store/settingSlice';

const MainWrapper = () => {
  const dispatch = useDispatch();
  // TODO: timeline visualization
  // TODO: set an event listener to handle resize
  
  const viewportHeight = useSelector(getWindowHeight);
  const { stories, epics, error, isLoading } = useScroll()
  const naturalScrollPosition = useSelector(selectNaturalScroll);
  const scrollPosition = useSelector(selectScroll);

  // BUG: Selector getPassedStoriesIds returned a different result when called with the same parameters. see console
  const passedStoriesIds = useSelector(getPassedStoriesIds);

  const storiesVisible = stories.filter(s => scrollPosition >= s.startPoint - 100 && scrollPosition <= s.startPoint + viewportHeight + 100)
  const epicsVisible = epics.filter(s => scrollPosition >= s.startPoint && scrollPosition <= s.endPoint)

  const newPassed = storiesVisible
    .filter(s => scrollPosition >= s.startPoint + viewportHeight)
    .filter(story => !passedStoriesIds.includes(story.id));
    
  // BUG: speed up pace ruin everything
  // TODO: delete passed stories if scoll up
  // TODO: delete passed stories if epic changed ?

  if (newPassed.length > 0) {
    dispatch(setPassedStories(newPassed));
  }

  if (error) {
    console.error('there is an error occured during prefetch records: ', error);
    return (<div>error, see console!</div>);
  }

  return (
    <Box
      bg="#2c81dd"
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
        <ProgressBar progress={30} />
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
            scrollPosition={scrollPosition}
          />

        </Flex>
      </Flex>
    </Box>
  )
}

export default MainWrapper;