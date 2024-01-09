import React from 'react'
import { iStoryEntity } from '../types/story.interface'
import styled from '@emotion/styled';

type Props = {
  naturalScrollPosition: number,
  story: iStoryEntity,
}

const Story: React.FC<Props> = ({
  naturalScrollPosition,
  story: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
   const topPosition = naturalScrollPosition - startPoint;
  
  console.log('natural position: ', title, naturalScrollPosition);
  console.log('starter: ', title, startPoint);
  console.log('toppos: ', title, topPosition);

  return (
    <StoryComp
      startP={topPosition}
      endP={endPoint}
    >
      <div>{title}</div>
      <div>{description}</div>
      <div>{startPoint}</div>
      <div>{endPoint}</div>
    </StoryComp>
  )
}

export default Story

type StyledProps = {
  startP: number,
  endP: number,
};

const StoryComp = styled.div<StyledProps>`
  position: absolute;
  top: ${({ startP }) => startP ? `${startP}px` : '0px'};
  left: 0;
  `