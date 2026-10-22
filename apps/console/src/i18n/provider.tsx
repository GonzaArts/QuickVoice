"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, localeCode, translate, type Locale } from "./config";

type TranslationsContext = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};
const Context = createContext<TranslationsContext | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale>(initialLocale);
  const router = useRouter();
  const setLocale = useCallback((nextLocale: Locale) => {
    if (nextLocale !== "es" && nextLocale !== "en") return;
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = localeCode(nextLocale);
    setCurrentLocale(nextLocale);
    // Server-rendered routes and metadata must observe the updated cookie.
    router.refresh();
  }, [router]);
  const t = useCallback((key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars), [locale]);
  const context = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

export function useLocale(): TranslationsContext {
  const context = useContext(Context);
  if (!context) throw new Error("useLocale must be used inside I18nProvider");
  return context;
}

export function useT(): TranslationsContext["t"] {
  return useLocale().t;
}
