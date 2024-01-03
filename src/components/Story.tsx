import React from 'react'
import { iStoryEntity } from '../types/story.interface'
import ScrollAmount from './ScrollAmount';
import { useSelector } from 'react-redux';
import { selectScroll } from '../store/scrollSlice';
import styled from '@emotion/styled';

type StoryProps = {
  comp: iStoryEntity,
}

const Story: React.FC<StoryProps> = ({
  comp: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
  const scrollNumber = useSelector(selectScroll);
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
  width: 100%;
  height: 100%;
  `