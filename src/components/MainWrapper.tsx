import React from 'react'
import PageTitle from './PageTitle'
import { Flex, Box, Center, Text } from "@chakra-ui/react";
import ScrollAmount from './ScrollAmount'
import Settings from './settings/Settings'
import { useScroll } from './../hooks/useScroll';
import { selectNaturalScroll, selectScroll } from '@store/scrollSlice';
import { useSelector } from 'react-redux';
import Story from './Story';
import Epic from './Epic';

const MainWrapper = () => {
  const { stories, epics, error, isLoading } = useScroll()
  const naturalScrollPosition = useSelector(selectNaturalScroll);
  const scrollPosition = useSelector(selectScroll);

  const storiesVisible = stories.filter(s => scrollPosition >= s.startPoint - 2000 && scrollPosition <= s.startPoint + 2000)
  const epicsVisible = epics.filter(s => scrollPosition >= s.startPoint && scrollPosition <= s.endPoint)

  if (error) {
    console.error('there is an error occured during prefetch records: ', error);
    return (<div>error, see console!</div>);
  }
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
        direction={{ base: "row", md: "row" }}
        p={0}
      >

        <Box
          height={{ base: "100vh" }}
          width={{ base: "60vw" }}
        >
          {storiesVisible.map(story => (
            <Story
              naturalScrollPosition={naturalScrollPosition}
              key={story.id}
              story={story}
            />
          ))}
        </Box>

        <Flex
          direction={{ base: "column", md: "column" }}
          p={4}
          justifyContent={{ base: "space-between" }}
          width="40vw"
        >
          <ScrollAmount />
          <Box
            mt={{ base: 4, md: 0 }}
          >
            {epicsVisible.map(epic => (
              <Epic
                scrollPosition={scrollPosition}
                key={epic.id}
                epic={epic}
              />
            ))}
          </Box>

        </Flex>
      </Flex>
    </Box>
  )
}

export default MainWrapper;