import "@mantine/core/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <MantineProvider theme={theme}>
      <Outlet />
    </MantineProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: 24 }}>
        <h1>{error.status} {error.statusText}</h1>
        <p>{typeof error.data === "string" ? error.data : "Route request failed."}</p>
      </div>
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";

  return (
    <div style={{ padding: 24 }}>
      <h1>Unexpected Error</h1>
      <p>{message}</p>
    </div>
  );
}

