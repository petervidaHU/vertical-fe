import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EventEmitterAsyncResource } from 'stream';

const initialState = {
  passedStories: [],
}

const storiesSlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    setPassedStories: (state, action: PayloadAction<any>) => { state.passedStories = [...state.passedStories, ...action.payload]},
  },
}
);

export const { setPassedStories } = storiesSlice.actions;

export const getPassedStories = (state) => state.stories.passedStories;
export const getPassedStoriesIds = (state) => state.stories.passedStories.reduce((acc, curr) => {
  acc.push(curr.id);
  return acc;
}, []);

export default storiesSlice.reducer;