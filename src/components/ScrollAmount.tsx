import React from 'react'
import { useSelector } from 'react-redux';
import { selectScroll } from '@store/scrollSlice';

const ScrollAmount: React.FC = () => {
  const scrollAmount = useSelector(selectScroll);
  return (
    <div>height: {scrollAmount}</div>
  )
}

export default ScrollAmount