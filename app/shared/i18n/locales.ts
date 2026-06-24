export const SUPPORTED_LOCALES = ["en", "hu"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_NAME = "locale";

export const LOCALE_STORAGE_KEY = "vertical:locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  hu: "HU",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) {
    return value;
  }

  if (typeof value === "string") {
    const base = value.split("-")[0]?.toLowerCase();
    if (isLocale(base)) {
      return base;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Pick the next locale when toggling through the supported list (wraps around).
 */
export function nextLocale(current: Locale): Locale {
  const index = SUPPORTED_LOCALES.indexOf(current);
  const nextIndex = (index + 1) % SUPPORTED_LOCALES.length;
  return SUPPORTED_LOCALES[nextIndex];
}

/**
 * Resolve a locale from a raw Cookie header value, falling back to the default.
 */
export function localeFromCookieHeader(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  const rawValue = decodeURIComponent(match.slice(LOCALE_COOKIE_NAME.length + 1));
  return isLocale(rawValue) ? rawValue : null;
}

/**
 * Resolve a locale from an Accept-Language header, returning the first supported match.
 */
export function localeFromAcceptLanguage(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) {
    return null;
  }

  const candidates = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().split("-")[0]?.toLowerCase())
    .filter((value): value is string => Boolean(value));

  const match = candidates.find((candidate) => isLocale(candidate));
  return match && isLocale(match) ? match : null;
}

/**
 * Resolve the active locale for a request: explicit cookie wins, then Accept-Language,
 * then the default.
 */
export function resolveRequestLocale(request: Request): Locale {
  const cookieLocale = localeFromCookieHeader(request.headers.get("Cookie"));
  if (cookieLocale) {
    return cookieLocale;
  }

  const acceptLocale = localeFromAcceptLanguage(request.headers.get("Accept-Language"));
  if (acceptLocale) {
    return acceptLocale;
  }

  return DEFAULT_LOCALE;
}
