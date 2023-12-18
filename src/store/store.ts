import { configureStore } from '@reduxjs/toolkit';
import { storiesApi } from './storyAPI';
import { useDispatch } from 'react-redux';
import scrollReducer from './scrollSlice';

export const store = configureStore({
  reducer: {
    [storiesApi.reducerPath]: storiesApi.reducer,
    scroll: scrollReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(storiesApi.middleware),
});

// Define a hook for use in your components
 export const useAppDispatch = () => useDispatch<typeof store.dispatch>();

 const sum = (a, b) => {
  
  
 }