import { createBrowserRouter } from "react-router-dom";
import MainWrapper from "./components/MainWrapper";
import Admin from "./admin/Admin";

export const routs = createBrowserRouter([
  {path: "/", element: <MainWrapper />},
  {path: "/admin", element: <Admin />},
])