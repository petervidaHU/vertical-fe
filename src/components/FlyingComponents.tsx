import React from 'react'
import { iStoryEntity } from '../types/story.interface';
import Story from './Story';

type FCProps = {
  comps: Array<iStoryEntity>,
}

const FlyingComponents: React.FC<FCProps> = ({ comps }) => {
  
  return (
    <>
      {comps.map((comp) => (
        <Story
          key={comp.id}
          comp={comp} />
      ))}
    </>
  );
}

export default FlyingComponents