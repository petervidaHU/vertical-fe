import React from 'react'
import { useSelector } from 'react-redux';
import { selectScroll } from '@store/scrollSlice';

const ScrollAmount: React.FC = () => {
  const scrollAmount = useSelector(selectScroll);
  return (
    <div>
    <p
      className="float-right font-bold text-3xl"
    >
      height: {scrollAmount}
    </p>
  </div>
  )
}

export default ScrollAmount