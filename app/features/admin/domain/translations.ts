import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "../../../shared/i18n/locales";

/**
 * Helpers for editing per-locale content translations in the admin.
 *
 * Admin forms name the default-locale (source) inputs with the bare field name
 * (`title`, `description`) and the non-default-locale inputs with a `_<locale>` suffix
 * (`title_hu`). Actions read those fields and upsert one translation row per non-default
 * locale; a fully-blank locale removes its row so the reader falls back to the source text.
 */

export const TRANSLATABLE_LOCALES: Locale[] = SUPPORTED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

export function translatedFieldName(base: string, locale: Locale): string {
  return locale === DEFAULT_LOCALE ? base : `${base}_${locale}`;
}

export function readTranslatedField(formData: FormData, base: string, locale: Locale): string {
  return String(formData.get(translatedFieldName(base, locale)) ?? "").trim();
}

/**
 * Default value for a translatable input: the base column for the source locale, otherwise
 * the matching translation row's field (empty string when missing).
 */
export function translationDefault<T extends { locale: string }>(
  baseValue: string,
  translations: readonly T[] | undefined,
  field: keyof T & string,
  locale: Locale,
): string {
  if (locale === DEFAULT_LOCALE) {
    return baseValue;
  }
  const row = translations?.find((entry) => entry.locale === locale);
  const value = row?.[field];
  return typeof value === "string" ? value : "";
}

export type TranslationInput = {
  locale: Locale;
  values: Record<string, string>;
  hasContent: boolean;
};

/** Read every non-default locale's values for the given translatable fields from a form. */
export function collectTranslationInputs(
  formData: FormData,
  fields: readonly string[],
): TranslationInput[] {
  return TRANSLATABLE_LOCALES.map((locale) => {
    const values: Record<string, string> = {};
    let hasContent = false;
    for (const field of fields) {
      const value = readTranslatedField(formData, field, locale);
      values[field] = value;
      if (value.length > 0) {
        hasContent = true;
      }
    }
    return { locale, values, hasContent };
  });
}

// Minimal structural view of a Prisma translation delegate (e.g. db.epicTranslation).
// Prisma's generated delegates have more specific overloaded signatures, so call sites
// pass them through `asTranslationDelegate()`.
export type TranslationWriteDelegate = {
  upsert: (args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }) => Promise<unknown>;
  deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
};

/**
 * Adapt a Prisma translation delegate (e.g. db.epicTranslation) to the minimal shape used
 * here. Prisma's overloaded method signatures aren't structurally assignable, so this is
 * the single sanctioned cast.
 */
export function asTranslationDelegate(delegate: {
  upsert: (args: never) => unknown;
  deleteMany: (args: never) => unknown;
}): TranslationWriteDelegate {
  return delegate as unknown as TranslationWriteDelegate;
}

/**
 * Upsert (or delete, when blank) the non-default-locale translation rows for an entity.
 *
 * `parentKey` is the FK column on the translation table (e.g. `epicId`); the compound
 * unique is assumed to be `[parentKey, locale]` (Prisma names it `${parentKey}_locale`).
 */
export async function writeEntityTranslations(options: {
  delegate: TranslationWriteDelegate;
  parentKey: string;
  parentId: string;
  fields: readonly string[];
  formData: FormData;
}): Promise<void> {
  const { delegate, parentKey, parentId, fields, formData } = options;
  const compoundKey = `${parentKey}_locale`;
  const inputs = collectTranslationInputs(formData, fields);

  for (const { locale, values, hasContent } of inputs) {
    if (!hasContent) {
      // eslint-disable-next-line no-await-in-loop
      await delegate.deleteMany({ where: { [parentKey]: parentId, locale } });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await delegate.upsert({
      where: { [compoundKey]: { [parentKey]: parentId, locale } },
      create: { [parentKey]: parentId, locale, ...values },
      update: { ...values },
    });
  }
}

/**
 * Build the translation rows for a freshly-created entity (used by importers/creators that
 * pass an explicit `{ <locale>: { field: value } }` map rather than form data).
 */
export function buildTranslationCreateRows(
  fields: readonly string[],
  byLocale: Partial<Record<Locale, Record<string, string>>> | undefined,
): Array<{ locale: Locale } & Record<string, string>> {
  if (!byLocale) {
    return [];
  }

  const rows: Array<{ locale: Locale } & Record<string, string>> = [];
  for (const locale of TRANSLATABLE_LOCALES) {
    const source = byLocale[locale];
    if (!source) {
      continue;
    }
    const values: Record<string, string> = {};
    let hasContent = false;
    for (const field of fields) {
      const value = typeof source[field] === "string" ? source[field].trim() : "";
      values[field] = value;
      if (value.length > 0) {
        hasContent = true;
      }
    }
    if (hasContent) {
      rows.push({ locale, ...values });
    }
  }
  return rows;
}
