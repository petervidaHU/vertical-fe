import { createBrowserRouter } from "react-router-dom";
import MainWrapper from "./components/MainWrapper";
import Admin from "./admin/Admin";

export const routes = createBrowserRouter([
  {path: "/", element: <MainWrapper />},
  {path: "/admin", element: <Admin />},
])