"use client";

import { Trans } from "@/src/i18n/Trans";
import { localeCode, type Locale } from "@/src/i18n/config";
import { useLocale } from "@/src/i18n/provider";
import { useEffect, useState } from "react";
import { Clock3, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type { DashboardSummary } from "@/src/lib/api/resources/dashboard";

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
};

function formatDateTime(value: string | number | undefined, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(localeCode(locale), DATE_TIME_FORMAT);
}

export function DashboardFreshness({
  summary,
  loading,
  dataUpdatedAt,
  isFetching,
  isStale,
  onRefresh,
}: {
  summary?: DashboardSummary;
  loading?: boolean;
  dataUpdatedAt: number;
  isFetching: boolean;
  isStale: boolean;
  onRefresh: () => void;
}) {
  const { locale, t } = useLocale();
  const [isOnline, setIsOnline] = useState(true);
  const hasData = Boolean(summary);
  const showStale = hasData && isStale && !isFetching;
  const displayDateTime = (value?: string | number) => formatDateTime(value, locale) ?? t("Not available");

  useEffect(() => {
    function syncOnlineState() {
      setIsOnline(navigator.onLine);
    }

    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);

    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  return (
    <section
      aria-busy={isFetching}
      aria-live="polite"
      className="rounded-lg border bg-card p-3 shadow-sm ring-1 ring-border/60"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border bg-muted/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              <Trans>{"Reporting window"}</Trans>
            </p>
            <p className="mt-1 text-foreground">
              {loading || !summary
                ? t("Loading selected period")
                : t("From {from} to {to}", {
                    from: displayDateTime(summary.period.from),
                    to: displayDateTime(summary.period.to),
                  })}
            </p>
          </div>
          <div className="rounded-md border bg-muted/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              <Trans>{"Last updated"}</Trans>
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-foreground">
              <Clock3 className="size-4 text-muted-foreground" />
              {dataUpdatedAt ? displayDateTime(dataUpdatedAt) : t("Not updated yet")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={isFetching || !isOnline}
          aria-label={t("Refresh dashboard")}
          className="h-10 w-full rounded-md bg-background sm:w-fit"
        >
          <RefreshCw className={isFetching ? "animate-spin" : undefined} />
          {isFetching ? <Trans>{"Refreshing"}</Trans> : <Trans>{"Refresh dashboard"}</Trans>}
        </Button>
      </div>
      {!isOnline ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
          <WifiOff className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <Trans>{"You are offline."}</Trans>{" "}
            {hasData
              ? t("Showing the last loaded dashboard data until your connection returns.")
              : t("Reconnect to load dashboard data.")}
          </span>
        </div>
      ) : showStale ? (
        <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Trans>{"Dashboard data is stale. Refresh to confirm the latest call activity."}</Trans>
        </div>
      ) : null}
    </section>
  );
}
