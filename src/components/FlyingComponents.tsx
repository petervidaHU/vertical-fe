import React from 'react'
import { iStoryEntity } from '../store/story.interface';
import Story from './Story';

type FCProps = {
  comps: Array<iStoryEntity>,
}

const FlyingComponents: React.FC<FCProps> = ({ comps }) => {
  console.log('comps: ', comps);

  return (
    <>
      {comps.map((comp) => (<Story comp={comp} />))}
    </>
  );
}

export default FlyingComponents