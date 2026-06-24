import { LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY, type Locale } from "./locales";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist the chosen locale on the client so SSR (cookie) and subsequent visits
 * (localStorage) render the same language. No-op during SSR.
 */
export function persistLocale(locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax`;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage can be unavailable in private modes; cookie still applies.
  }
}
