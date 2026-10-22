import english from "./messages/en.json";
import spanish from "./messages/es.json";
import extendedSpanish from "./messages/extended.es.json";

export const DEFAULT_LOCALE = "es" as const;
export const LOCALE_COOKIE = "qv_locale";
export type Locale = "es" | "en";
export type MessageKey = keyof typeof english | keyof typeof extendedSpanish;
type Interpolation = Record<string, string | number>;
// Supplemental English keys are the original interface text. English falls
// back to the key itself; Spanish resolves through both dictionaries.
const dictionaries: Record<Locale, Record<string, string>> = {
  es: { ...spanish, ...extendedSpanish },
  en: english,
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" || value?.toLowerCase().startsWith("en-") ? "en" : "es";
}

export function translate(locale: Locale, key: string, vars?: Interpolation): string {
  const message = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, name: string) =>
    vars?.[name] === undefined ? match : String(vars[name])
  );
}

export function localeCode(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeCode(locale), options).format(value);
}

export function formatDate(locale: Locale, date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(localeCode(locale), options ?? { dateStyle: "medium" }).format(date);
}
