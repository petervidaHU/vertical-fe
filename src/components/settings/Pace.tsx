import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectPace, dividePace, multiplyPace } from '../../store/paceSlice';

const Pace = () => { 
  const dispatch = useDispatch();
  const pace = useSelector(selectPace);
  const userFriendlyPace = (p) => {
    if (p > 10) {
      return `${p / 10} km / scroll`
    }
     return `${ p * 100 } m / scroll`
    }
  
  return (
    <div className="flex space-x-2">
    <button className="py-2 px-4 bg-blue-500 text-white rounded" onClick={() => dispatch(dividePace())}>-</button>
    <div>
      <p>{userFriendlyPace(pace)}</p>
  
    </div>
    <button className="py-2 px-4 bg-blue-500 text-white rounded" onClick={() => dispatch(multiplyPace())}>+</button>
  </div>
  )
}

export default Pace;
