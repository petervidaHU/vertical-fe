import React from 'react'
import { iStoryEntity } from '../types/story.interface'
import styled from '@emotion/styled';

type Props = {
  scrollNumber: number,
  comp: iStoryEntity,
}

const Story: React.FC<Props> = ({
  scrollNumber,
  comp: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
 const topPosition = scrollNumber - startPoint;

  const isVisible = () => scrollNumber >= startPoint && scrollNumber <= endPoint;

  if (!isVisible()) return null;

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
  display: ${({isVisible}) => isVisible ? 'block' : 'none'};
  position: absolute;
  top: ${({startP}) => startP ? `${startP}px` : '0px'};
  left: 0;
  // width: 100%;
  // height: 100%;
  `