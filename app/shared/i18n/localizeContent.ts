import { DEFAULT_LOCALE, type Locale } from "./locales";

/**
 * Resolve translatable content fields against a locale, falling back to the base column
 * (which always holds the default-locale / source text) whenever a translation row is
 * missing or a specific field is blank.
 *
 * The default locale short-circuits: base columns already hold that text.
 */

type LocaleRow = { locale: string };

function pickTranslation<T extends LocaleRow>(translations: T[] | undefined, locale: Locale): T | undefined {
  return translations?.find((row) => row.locale === locale);
}

function resolveField(base: string, translated: unknown): string {
  if (typeof translated === "string" && translated.trim().length > 0) {
    return translated;
  }
  return base;
}

// --- Epic ---------------------------------------------------------------

export type EpicTranslationRow = { locale: string; title: string; description: string };

export function localizeEpic<T extends { title: string; description: string; translations?: EpicTranslationRow[] }>(
  epic: T,
  locale: Locale,
): Omit<T, "translations"> {
  const { translations, ...rest } = epic;
  if (locale === DEFAULT_LOCALE) {
    return rest;
  }
  const row = pickTranslation(translations, locale);
  return {
    ...rest,
    title: resolveField(epic.title, row?.title),
    description: resolveField(epic.description, row?.description),
  };
}

// --- Story --------------------------------------------------------------

export type StoryTranslationRow = {
  locale: string;
  title: string;
  description: string;
  extraContent: string;
  lineLabel: string;
  tooltipText: string;
};

export function localizeStory<
  T extends {
    title: string;
    description: string;
    extraContent: string;
    lineLabel: string;
    tooltipText: string;
    translations?: StoryTranslationRow[];
  },
>(story: T, locale: Locale): Omit<T, "translations"> {
  const { translations, ...rest } = story;
  if (locale === DEFAULT_LOCALE) {
    return rest;
  }
  const row = pickTranslation(translations, locale);
  return {
    ...rest,
    title: resolveField(story.title, row?.title),
    description: resolveField(story.description, row?.description),
    extraContent: resolveField(story.extraContent, row?.extraContent),
    lineLabel: resolveField(story.lineLabel, row?.lineLabel),
    tooltipText: resolveField(story.tooltipText, row?.tooltipText),
  };
}

// --- AltitudeInfoValue --------------------------------------------------

export type AltitudeInfoValueTranslationRow = { locale: string; value: string };

export function localizeAltitudeInfoValue<
  T extends { value: string; translations?: AltitudeInfoValueTranslationRow[] },
>(value: T, locale: Locale): Omit<T, "translations"> {
  const { translations, ...rest } = value;
  if (locale === DEFAULT_LOCALE) {
    return rest;
  }
  const row = pickTranslation(translations, locale);
  return {
    ...rest,
    value: resolveField(value.value, row?.value),
  };
}

// --- AltitudeInfo (with nested values) ----------------------------------

export type AltitudeInfoTranslationRow = { locale: string; title: string };

export function localizeAltitudeInfo<
  T extends {
    title: string;
    translations?: AltitudeInfoTranslationRow[];
    values: Array<{ value: string; translations?: AltitudeInfoValueTranslationRow[] }>;
  },
>(altitudeInfo: T, locale: Locale): Omit<T, "translations"> {
  const { translations, ...rest } = altitudeInfo;
  const localizedValues = altitudeInfo.values.map((value) => localizeAltitudeInfoValue(value, locale));
  if (locale === DEFAULT_LOCALE) {
    return { ...rest, values: localizedValues };
  }
  const row = pickTranslation(translations, locale);
  return {
    ...rest,
    title: resolveField(altitudeInfo.title, row?.title),
    values: localizedValues,
  };
}

// --- Tag ----------------------------------------------------------------

export type TagTranslationRow = { locale: string; name: string };

export function localizeTag<T extends { name: string; translations?: TagTranslationRow[] }>(
  tag: T,
  locale: Locale,
): Omit<T, "translations"> {
  const { translations, ...rest } = tag;
  if (locale === DEFAULT_LOCALE) {
    return rest;
  }
  const row = pickTranslation(translations, locale);
  return {
    ...rest,
    name: resolveField(tag.name, row?.name),
  };
}

// --- Journey ------------------------------------------------------------

export type JourneyTranslationRow = { locale: string; name: string };

export function localizeJourney<T extends { name: string; translations?: JourneyTranslationRow[] }>(
  journey: T,
  locale: Locale,
): Omit<T, "translations"> {
  const { translations, ...rest } = journey;
  if (locale === DEFAULT_LOCALE) {
    return rest;
  }
  const row = pickTranslation(translations, locale);
  return {
    ...rest,
    name: resolveField(journey.name, row?.name),
  };
}
