import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface InitialState {
  height: number,
}

const initialState: InitialState = {
  height: 0,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setWindowHeight: (state, action: PayloadAction<any>) => { state.height = action.payload},
  },
}
);

export const { setWindowHeight } = settingsSlice.actions;

export const getWindowHeight = (state): number => state.settings.height;

export default settingsSlice.reducer;