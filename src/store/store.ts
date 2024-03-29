import { configureStore } from '@reduxjs/toolkit';
import { storiesApi } from '../API/storyAPI';
import { useDispatch } from 'react-redux';
import scrollReducer from './scrollSlice';
import paceReducer from './paceSlice';
import storiesReducer from './storiesSlice';
import settingsSlice from './settingSlice';

export const store = configureStore({
  reducer: {
    [storiesApi.reducerPath]: storiesApi.reducer,
    scroll: scrollReducer,
    pace: paceReducer,
    stories: storiesReducer,
    settings: settingsSlice,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(storiesApi.middleware),
});

 export const useAppDispatch = () => useDispatch<typeof store.dispatch>();
