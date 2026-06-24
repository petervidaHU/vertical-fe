import "@mantine/core/styles.css";
import "@mantine/tiptap/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import { I18nextProvider } from "react-i18next";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import { createI18n } from "./shared/i18n/config";
import { DEFAULT_LOCALE, resolveRequestLocale } from "./shared/i18n/locales";

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
});

export function loader({ request }: { request: Request }) {
  return { locale: resolveRequestLocale(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData("root") as { locale?: string } | undefined;
  return (
    <html lang={data?.locale ?? DEFAULT_LOCALE}>
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
  const { locale } = useLoaderData<typeof loader>();
  const i18n = createI18n(locale);

  return (
    <I18nextProvider i18n={i18n}>
      <MantineProvider theme={theme}>
        <Outlet />
      </MantineProvider>
    </I18nextProvider>
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

