import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { Provider } from "react-redux";
import { store } from "./store/store";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}
