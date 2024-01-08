import React from 'react'
import PageTitle from './PageTitle'
import styled from '@emotion/styled'
import { useScroll } from '../hooks/useScroll'
import ScrollAmount from './ScrollAmount'
import StorySelector from './StorySelector'

const MainWrapper = () => {
  const { data, error, isLoading, scrollAmount } = useScroll()

  return (
    <Main>
      <PageTitle />
      <GridContainer>
        <div>
          {data && data.length > 0 && (
            <StorySelector comps={data} />
          )}
        </div>
        <RightChannel>
          <ScrollAmount height={scrollAmount} />
        </RightChannel>
      </GridContainer>
    </Main>
  )
}

export default MainWrapper

const Main = styled.section`
      /* display: flex; */
      /* flex-direction: column; */
      /* align-items: center; */
      /* justify-content: center; */
      width: auto;
      height: 100vh;
      background: #0f0919;
      color: #ffffff;
      overflow: hidden;
      position: relative;
      z-index: 1;
      `;      

const GridContainer = styled.div`
      margin-inline-start: 40px;
      display: grid;
      grid-template-columns: 80% auto;
      grid-column-gap: 10px;

      @media (max-width: 750px) {
        grid - template - columns: 1fr;
  }
  > div {
        min - width: 300px;
  }
      `;

const RightChannel = styled.div`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: #106969;
      color: #0f0919;
      font-size: 2rem;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      padding: 10px;
      `