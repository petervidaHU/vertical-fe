import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ChakraProvider } from "@chakra-ui/react";
import { Provider } from "react-redux";
import { store } from "./store/store";
import MainWrapper from "./components/MainWrapper";
import ErrorPage from "./components/ErrorComponent";
import { routes } from "./routes";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);

  root.render(
    <Provider store={store}>
      <ChakraProvider>
        <RouterProvider router={routes} />
      </ChakraProvider>
    </Provider>
  );
}
