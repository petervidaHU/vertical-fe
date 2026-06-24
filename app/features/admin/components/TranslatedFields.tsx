import { useState, type ReactNode } from "react";
import { Tabs } from "@mantine/core";
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  normalizeLocale,
  type Locale,
} from "../../../shared/i18n/locales";

type TranslatedFieldsProps = {
  /** Render the inputs for a given locale. Field names must use translatedFieldName(). */
  render: (locale: Locale, isSourceLocale: boolean) => ReactNode;
};

/**
 * Language tabs (EN | HU | …) for admin editors. Every locale panel stays mounted, so the
 * hidden non-active inputs still submit with the surrounding <Form>.
 */
export default function TranslatedFields({ render }: TranslatedFieldsProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>(DEFAULT_LOCALE);

  return (
    <Tabs
      value={activeLocale}
      onChange={(value) => setActiveLocale(normalizeLocale(value))}
      variant="outline"
    >
      <Tabs.List>
        {SUPPORTED_LOCALES.map((locale) => (
          <Tabs.Tab key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
            {locale === DEFAULT_LOCALE ? " (source)" : ""}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {SUPPORTED_LOCALES.map((locale) => (
        <Tabs.Panel key={locale} value={locale} pt="sm">
          {render(locale, locale === DEFAULT_LOCALE)}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
