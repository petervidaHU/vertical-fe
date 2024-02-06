import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  naturalScroll: 0,
  scroll: 0,
  lastId: null,
};

const scrollSlice = createSlice({
  name: 'scroll',
  initialState,
  reducers: {
    setScroll: (state, action) => { state.scroll = action.payload },
    setNaturalScroll: (state, action) => { state.naturalScroll = action.payload },
    setLastId: (state, action) => { state.lastId = action.payload }, 
  }
});

export const { setScroll, setNaturalScroll, setLastId } = scrollSlice.actions;

export const getScroll = (state) => state.scroll.scroll;
export const getNaturalScroll = (state) => state.scroll.naturalScroll;
export const getLastId = (state) => state.scroll.lastId;

export default scrollSlice.reducer;
