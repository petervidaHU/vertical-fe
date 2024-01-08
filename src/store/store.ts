import { configureStore } from '@reduxjs/toolkit';
import { storiesApi } from '../API/storyAPI';
import { useDispatch } from 'react-redux';
import scrollReducer from './scrollSlice';
import paceReducer from './paceSlice';

export const store = configureStore({
  reducer: {
    [storiesApi.reducerPath]: storiesApi.reducer,
    scroll: scrollReducer,
    pace: paceReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(storiesApi.middleware),
});

 export const useAppDispatch = () => useDispatch<typeof store.dispatch>();
