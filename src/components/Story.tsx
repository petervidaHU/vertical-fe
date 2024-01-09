import React, { useRef } from 'react'
import { iStoryEntity } from '../types/story.interface'
import styled from '@emotion/styled';

type Props = {
  naturalScrollPosition: number,
  scrollPosition: number,
  comp: iStoryEntity,
}

const Story: React.FC<Props> = ({
  scrollPosition,
  naturalScrollPosition,
  comp: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
  const isVisible = () => scrollPosition >= startPoint && scrollPosition <= endPoint;
  if (!isVisible()) return null;

   const starter= useRef<number>(naturalScrollPosition);
   const topPosition = naturalScrollPosition - starter.current;
  
  console.log('natural position: ', title, naturalScrollPosition);
  console.log('starter: ', title, starter);
  console.log('toppos: ', title, topPosition);

  return (
    <StoryComp
      isVisible={isVisible()}
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
  isVisible: boolean,
  startP: number,
  endP: number,
};

const StoryComp = styled.div<StyledProps>`
  display: ${({ isVisible }) => isVisible ? 'block' : 'none'};
  position: absolute;
  top: ${({ startP }) => startP ? `${startP}px` : '0px'};
  left: 0;
  // width: 100%;
  // height: 100%;
  `