"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/src/i18n/provider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Languages aria-hidden="true" className="size-4" />
      {!compact && <span className="hidden sm:inline">{t("Language")}</span>}
      <select
        aria-label={t("Interface language")}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={locale}
        onChange={(event) => setLocale(event.target.value === "en" ? "en" : "es")}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
