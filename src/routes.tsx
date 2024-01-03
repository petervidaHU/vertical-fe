import { createBrowserRouter } from "react-router-dom";
import MainWrapper from "./components/MainWrapper";
import Admin from "./admin/Admin";
import ErrorPage from "./components/ErrorComponent";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <MainWrapper />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
])