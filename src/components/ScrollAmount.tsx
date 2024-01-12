import React from 'react'
import { useSelector } from 'react-redux';
import { getScroll } from '@store/scrollSlice';

const ScrollAmount: React.FC = () => {
  const scrollAmount = useSelector(getScroll);
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