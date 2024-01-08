import React from 'react'
import { TypeOfStory, iStoryEntity } from '../types/story.interface';
import Story from './Story';
import Epic from './Epic';
import { useSelector } from 'react-redux';
import { selectScroll } from '../store/scrollSlice';

type Props = {
  comps: Array<iStoryEntity>,
}

const StorySelector: React.FC<Props> = ({ comps }) => {
  const scrollNumber = useSelector(selectScroll);
  console.log('comps: ', comps);

  return (
    <>
      {comps.map(comp =>
        comp.type === TypeOfStory.Story ? (
          <Story
            scrollNumber={scrollNumber}
            key={comp.id}
            comp={comp}
          />
        ) : (
          <Epic
            scrollNumber={scrollNumber}
            key={comp.id}
            comp={comp}
          />
        )
      )}
    </>
  );
}

export default StorySelector