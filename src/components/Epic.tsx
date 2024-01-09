import React from 'react'
import { iStoryEntity } from '../types/story.interface'
import styled from '@emotion/styled'

type Props = {
  naturalScrollPosition: number,
  scrollPosition: number,
  comp: iStoryEntity,
}

const Epic: React.FC<Props> = ({
  scrollPosition,
  naturalScrollPosition,
  comp: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
const isVisible = scrollPosition >= startPoint && scrollPosition <= endPoint;

  return (
    <>
     <EpicComp
      isVisible={isVisible}
    >
      <div>{title}</div>
      <div>{description}</div>
      <div>{startPoint}</div>
      <div>{endPoint}</div>
    </EpicComp>
    </>
  )
}

export default Epic

type StyledProps = {
  isVisible: boolean,
};

const EpicComp = styled.div<StyledProps>`
  display: ${({isVisible}) => isVisible ? 'block' : 'none'};
  position: absolute;
  bottom: 100px; 
  right: 100px;
  `
