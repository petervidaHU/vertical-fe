import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  naturalScroll: 0,
  scroll: 0,
};

const scrollSlice = createSlice({
  name: 'scroll',
  initialState,
  reducers: {
    setScroll: (state, action) => { state.scroll = action.payload },
    setNaturalScroll: (state, action) => { state.naturalScroll = action.payload }, 
  }
});

export const { setScroll, setNaturalScroll } = scrollSlice.actions;

export const selectScroll = (state) => state.scroll.scroll;
export const selectNaturalScroll = (state) => state.scroll.naturalScroll;

export default scrollSlice.reducer;
