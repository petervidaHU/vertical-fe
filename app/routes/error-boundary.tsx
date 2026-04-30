import { Alert, Stack, Text, Title } from "@mantine/core";
import { isRouteErrorResponse, useRouteError } from "react-router";

const RouteErrorBoundary = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <Stack>
        <Title order={2}>Route Error</Title>
        <Alert color="red" title={`${error.status} ${error.statusText}`}>
          {typeof error.data === "string" ? error.data : "Request failed."}
        </Alert>
      </Stack>
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";

  return (
    <Stack>
      <Title order={2}>Unexpected Error</Title>
      <Alert color="red" title="Something went wrong">
        <Text>{message}</Text>
      </Alert>
    </Stack>
  );
};

export default RouteErrorBoundary;
