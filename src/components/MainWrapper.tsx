import React from 'react'
import PageTitle from './PageTitle'
import ScrollAmount from './ScrollAmount'
import Settings from './settings/Settings'
import { useScroll } from './../hooks/useScroll';
import { getNaturalScroll, getScroll } from '@store/scrollSlice';
import { useDispatch, useSelector } from 'react-redux';
import VisibleStories from './VisibleStories';
import Epics from './Epics';
import { getPassedStoriesIds, setPassedStories } from '@store/storiesSlice';
import ProgressBar from './ProgressBar';
import { getWindowHeight } from '@store/settingSlice';

const MainWrapper = () => {
  const dispatch = useDispatch();
  
  // TODO: set an event listener to handle resize

  const viewportHeight = useSelector(getWindowHeight);
  const { stories, epics, error, isLoading } = useScroll()
  const naturalScrollPosition = useSelector(getNaturalScroll);
  const scrollPosition = useSelector(getScroll);

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
    <div
      className="bg-blue-600 text-white min-h-screen relative overflow-hidden h-lvh p-0"
    >
      <Settings />
      <PageTitle />

      <div className="flex p-0">
        <ProgressBar />
        <div className="flex-col w-3/5">
          <VisibleStories
            pos={scrollPosition}
            stories={storiesVisible}
          />
        </div>

        <div className="flex flex-col p-4 justify-between w-2/5">
          <ScrollAmount />

          <Epics
            epics={epicsVisible}
            scrollPosition={scrollPosition}
          />

        </div>
      </div>
      {isLoading && <div
        className='font-semibold text-lg text-fuchsia-600 absolute bottom-4 left-auto right-auto bg-gray-50 mx-px'
      >
        loading...
      </div>
      }
    </div>
  )
}

export default MainWrapper;