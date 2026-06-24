import i18n, { createInstance, type i18n as I18nInstance, type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./resources/en.json";
import hu from "./resources/hu.json";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale, normalizeLocale } from "./locales";

export const i18nResources = {
  en: { translation: en },
  hu: { translation: hu },
} as const;

function baseOptions(lng: Locale): InitOptions {
  return {
    resources: i18nResources,
    lng,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  };
}

/**
 * Create an i18next instance bound to the given locale.
 *
 * Resources are inlined so initialization is synchronous (no async backend), which keeps
 * server and client renders deterministic and avoids hydration mismatches.
 *
 * On the server a fresh instance is created per call so concurrent requests with different
 * locales never bleed into one another. On the client the shared singleton is reused.
 */
export function createI18n(locale: Locale = DEFAULT_LOCALE): I18nInstance {
  const lng = normalizeLocale(locale);
  const isServer = typeof document === "undefined";

  if (isServer) {
    const instance = createInstance();
    void instance.use(initReactI18next).init(baseOptions(lng));
    return instance;
  }

  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init(baseOptions(lng));
  } else if (i18n.language !== lng) {
    void i18n.changeLanguage(lng);
  }

  return i18n;
}

export default i18n;
