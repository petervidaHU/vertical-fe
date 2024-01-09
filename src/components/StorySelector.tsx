import React from 'react'
import { TypeOfStory, iStoryEntity } from '../types/story.interface';
import Story from './Story';
import Epic from './Epic';
import { useSelector } from 'react-redux';
import { selectNaturalScroll, selectScroll } from '../store/scrollSlice';

type Props = {
  comps: Array<iStoryEntity>,
}

const StorySelector: React.FC<Props> = ({ comps }) => {
  const naturalScrollPosition = useSelector(selectNaturalScroll);
  const scrollPosition = useSelector(selectScroll);
  console.log('comps: ', comps);

  return (
    <>
      {comps.map(comp =>
        comp.type === TypeOfStory.Story ? (
          <Story
            scrollPosition={scrollPosition}
            naturalScrollPosition={naturalScrollPosition}
            key={comp.id}
            comp={comp}
          />
        ) : (
          <Epic
            scrollPosition={scrollPosition}
            naturalScrollPosition={naturalScrollPosition}
            key={comp.id}
            comp={comp}
          />
        )
      )}
    </>
  );
}

export default StorySelector