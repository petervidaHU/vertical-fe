import { createBrowserRouter } from "react-router-dom";
import MainWrapper from "./components/MainWrapper";
import Admin from "./admin/Admin";
import ErrorPage from "./components/ErrorComponent";
import StoryForm from "./admin/StoryForm";
import StoriesList from "./admin/List";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <MainWrapper />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/admin",
    element: <Admin />,
    children: [
      {
        path: "edit/:id?",
        element: <StoryForm />
      },
      {
        path: "list",
        element: <StoriesList />
      },
    ],
  },
 
])