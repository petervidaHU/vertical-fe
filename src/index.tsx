import "@style/tailwind.css";
import { createRoot } from "react-dom/client";
import { store } from "@store/store";
import { Provider } from "react-redux";
import App from "./App";

const isRewriteEnabled = process.env.REWRITE_APP_ENABLED === "true";

const bootstrapLegacyApp = () => {
  const container = document.getElementById("root");
  if (!container) {
    return;
  }

  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
};

if (isRewriteEnabled) {
  void import("../app/entry.client");
} else {
  bootstrapLegacyApp();
}
