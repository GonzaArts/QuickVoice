import english from "./messages/en.json";
import spanish from "./messages/es.json";
import extendedSpanish from "./messages/extended.es.json";
import extendedEnglish from "./messages/extended.en.json";

export const DEFAULT_LOCALE = "es" as const;
export const LOCALE_COOKIE = "qv_locale";
export type Locale = "es" | "en";
export type MessageKey = keyof typeof english | keyof typeof extendedSpanish;
type Interpolation = Record<string, string | number>;
// Both locales explicitly declare every source key, including supplemental copy.
const dictionaries: Record<Locale, Record<string, string>> = {
  es: { ...spanish, ...extendedSpanish },
  en: { ...english, ...extendedEnglish },
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const normalized = value?.trim().toLowerCase();
  return normalized === "en" || normalized?.startsWith("en-") ? "en" : "es";
}

export function hasMessage(key: string): boolean {
  return Object.hasOwn(dictionaries.es, key) && Object.hasOwn(dictionaries.en, key);
}

// Some form libraries store the translated message. Recover its source key so
// shared error rendering can keep the guidance and respond to language changes.
const spanishSourceKeys = new Map(Object.entries(dictionaries.es).map(([key, value]) => [value, key]));
export function messageKey(text: string): string | undefined {
  return hasMessage(text) ? text : spanishSourceKeys.get(text);
}

export function translate(locale: Locale, key: string, vars?: Interpolation): string {
  const message = (Object.hasOwn(dictionaries[locale], key) ? dictionaries[locale][key] : undefined)
    ?? (Object.hasOwn(dictionaries.en, key) ? dictionaries.en[key] : undefined) ?? key;
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, name: string) =>
    vars?.[name] === undefined ? match : String(vars[name])
  );
}

export function localeCode(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}

export function formatLanguage(locale: Locale, code: string, fallback = code): string {
  try {
    const label = new Intl.DisplayNames([localeCode(locale)], { type: "language", fallback: "none" }).of(code);
    return label ? label.charAt(0).toLocaleUpperCase(localeCode(locale)) + label.slice(1) : fallback;
  } catch {
    return fallback;
  }
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeCode(locale), options).format(value);
}

export function formatDate(locale: Locale, date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(localeCode(locale), options ?? { dateStyle: "medium" }).format(date);
}
