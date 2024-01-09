import React from 'react'
import { iStoryEntity } from '../types/story.interface'
import styled from '@emotion/styled'

type Props = {
  scrollPosition: number,
  epic: iStoryEntity,
}

const Epic: React.FC<Props> = ({
  scrollPosition,
  epic: {
    title,
    description,
    startPoint,
    endPoint,
  },
}) => {
  return (
    <>
     <EpicComp>
      <div>{title}</div>
      <div>{description}</div>
      <div>{startPoint}</div>
      <div>{endPoint}</div>
    </EpicComp>
    </>
  )
}

export default Epic

const EpicComp = styled.div`
  position: absolute;
  bottom: 100px; 
  right: 100px;
  `
