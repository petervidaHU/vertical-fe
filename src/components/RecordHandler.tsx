import React from 'react'
import Story from './Story';
import Epic from './Epic';
import { useSelector } from 'react-redux';
import { selectNaturalScroll, selectScroll } from '../store/scrollSlice';
import { useScroll } from '../hooks/useScroll';


const RecordHandler: React.FC = () => {
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
    <>
      {storiesVisible.map(story => (
        <Story
          naturalScrollPosition={naturalScrollPosition}
          key={story.id}
          story={story}
        />
      ))}

      {epicsVisible.map(epic => (
        <Epic
          scrollPosition={scrollPosition}
          key={epic.id}
          epic={epic}
        />
      ))}
    </>
  );
}

export default RecordHandler