import React from 'react'
import PageTitle from './PageTitle'
import styled from '@emotion/styled'
import { useScroll } from '../hooks/useScroll'
import ScrollAmount from './ScrollAmount'
import FlyingComponents from './FlyingComponents'

const MainWrapper = () => {
  const { data, error, isLoading, scrollAmount } = useScroll()

  return (
    <>
      <PageTitle />
      <ScrollAmount height={scrollAmount} />
      <GridContainer>
        <div>
          {data && data.length > 0 && (
            <FlyingComponents comps={data} />
          )}
        </div>
        <div>
          20
        </div>
      </GridContainer>
    </>
  )
}

export default MainWrapper

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 80% auto;
  grid-column-gap: 10px;

  @media (max-width: 750px) {
    grid-template-columns: 1fr;
  }

  > div {
    min-width: 300px;
  }
`;