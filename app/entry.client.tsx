import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { createI18n } from "./shared/i18n/config";
import { localeFromCookieHeader } from "./shared/i18n/locales";

// Initialize the i18n singleton from the persisted cookie before hydration so the first
// client render matches the server-rendered language.
createI18n(localeFromCookieHeader(document.cookie) ?? undefined);


hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>
);
