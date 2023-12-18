import React from 'react'

type ScrollAmountType = {
  height: number
}

const ScrollAmount: React.FC<ScrollAmountType> = ({height} ) => {
  return (
    <div>height: {height}</div>
  )
}

export default ScrollAmount