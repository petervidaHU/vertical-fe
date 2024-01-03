import { createBrowserRouter } from "react-router-dom";
import MainWrapper from "./components/MainWrapper";
import Admin from "./admin/Admin";
import ErrorPage from "./components/ErrorComponent";
import StoryForm from "./admin/StoryForm";

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
        path: "edit",
        element: <StoryForm onSubmit={(a: any) => { console.log(a) }} />
      },
    ],
  },
 
])