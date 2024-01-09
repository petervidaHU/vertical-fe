import React from 'react'
import { TypeOfStory, iStoryEntity } from '../types/story.interface';
import Story from './Story';
import Epic from './Epic';
import { useSelector } from 'react-redux';
import { selectNaturalScroll, selectScroll } from '../store/scrollSlice';

type Props = {
  stories: Array<iStoryEntity>,
}

const StorySelector: React.FC<Props> = ({ stories }) => {
  const naturalScrollPosition = useSelector(selectNaturalScroll);
  const scrollPosition = useSelector(selectScroll);
  console.log('comps: ', stories);
  const s = stories.filter(s => scrollPosition >= s.startPoint - 2000 && scrollPosition <= s.startPoint + 2000 )
  console.log('s: ', s);

  return (
    <>
      {s.map(comp =>
        comp.type === TypeOfStory.Story ? (
          <Story
            naturalScrollPosition={naturalScrollPosition}
            key={comp.id}
            story={comp}
          />
        ) : (
          <Epic
            scrollPosition={scrollPosition}
            key={comp.id}
            epic={comp}
          />
        )
      )}
    </>
  );
}

export default StorySelector