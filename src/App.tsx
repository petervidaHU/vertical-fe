import React, { useEffect } from 'react'
import "@style/tailwind.css";
import { ChakraProvider } from '@chakra-ui/react';
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
    <ChakraProvider>
      <RouterProvider router={routes} />
    </ChakraProvider>
  )
}

export default App