import React from 'react'
import PageTitle from './PageTitle'
import { Box, Grid, GridItem, Center } from "@chakra-ui/react";
import ScrollAmount from './ScrollAmount'
import RecordHandler from './RecordHandler'
import Settings from './settings/Settings'

const MainWrapper = () => {
  return (
    <Box bg="#0f0919" color="#ffffff" h="100vh" position="relative" overflow="hidden" zIndex="1">
      <Settings />
      <PageTitle />
      <Grid
        templateColumns={{ base: "1fr", md: "80% auto" }}
        gap={2}
        p={4}
      >
        <GridItem minWidth='300px'>
          <RecordHandler />
        </GridItem>
        <GridItem bg="#106969" color="#0f0919" fontSize="2rem" fontWeight="700" textTransform="uppercase" textAlign="center">
          <Center h="100%" w="100%" p={2}>
            <ScrollAmount />
          </Center>
        </GridItem>
      </Grid>
    </Box>
  )
}

export default MainWrapper;