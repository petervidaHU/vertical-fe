import React, { useEffect } from 'react'
import { setWindowHeight } from '@store/settingSlice';
import { useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { routes } from './routes';

const App = () => {
  const dispatch = useDispatch();
  dispatch(setWindowHeight(window.innerHeight))

  useEffect(() => {
    const handleResize = () => dispatch(setWindowHeight(window.innerHeight));
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };

  }, []);

  return (
      <RouterProvider router={routes} />
  )
}

export default App