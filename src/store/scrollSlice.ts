import { createSlice } from '@reduxjs/toolkit';

const scrollSlice = createSlice({
  name: 'scroll',
  initialState: 0,
  reducers: {
    setScroll: (state, action) => action.payload,
  }
});

export const { setScroll } = scrollSlice.actions;

export const selectScroll = state => state.scroll;

export default scrollSlice.reducer;
