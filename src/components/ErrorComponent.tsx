import { useRouteError } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError() as any;
  console.error(error);

  return (
    <div>
      <p>Unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </div>
  );
}

export default ErrorPage
