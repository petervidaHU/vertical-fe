import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const paceSlice = createSlice({
  name: 'pace',
  initialState: 1,
  reducers: {
    setPace: (state, action: PayloadAction<number>) => action.payload,
    multiplyPace: (state) => state * 10,
    dividePace: (state) => state > 1 ? state / 10 : state,
  },
}
);

export const { setPace, multiplyPace, dividePace } = paceSlice.actions;

export const selectPace = (state) => state.pace;

export default paceSlice.reducer;