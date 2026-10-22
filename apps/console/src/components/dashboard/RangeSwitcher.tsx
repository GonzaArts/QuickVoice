"use client";

import { Trans } from "@/src/i18n/Trans";
import { useT } from "@/src/i18n/provider";
import { useState, useTransition } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/src/components/ui/toggle-group";
import type { DashboardRange } from "@/src/lib/api/resources/dashboard";

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "custom", label: "Custom" },
];

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultCustomDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export function RangeSwitcher({
  current,
  customFrom,
  customTo,
  loading = false,
}: {
  current: DashboardRange;
  customFrom?: string;
  customTo?: string;
  loading?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [defaults] = useState(() => defaultCustomDates());
  const [from, setFrom] = useState(customFrom ?? defaults.from);
  const [to, setTo] = useState(customTo ?? defaults.to);
  const busy = loading || isPending;
  const customSelected = current === "custom";
  const invalidCustomRange = customSelected && Boolean(from && to && to < from);

  function replaceWith(nextParams: URLSearchParams) {
    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`);
    });
  }

  function onChange(value: string) {
    if (!value) return;
    const next = new URLSearchParams(params);
    next.set("range", value);

    if (value === "custom") {
      next.set("from", from || defaults.from);
      next.set("to", to || defaults.to);
    } else {
      next.delete("from");
      next.delete("to");
    }

    replaceWith(next);
  }

  function applyCustomRange() {
    if (!from || !to || to < from) return;
    const next = new URLSearchParams(params);
    next.set("range", "custom");
    next.set("from", from);
    next.set("to", to);
    replaceWith(next);
  }

  return (
    <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-2 shadow-sm sm:flex-row sm:items-center">
        <ToggleGroup
          type="single"
          size="sm"
          value={current}
          onValueChange={onChange}
          aria-label={t("Dashboard date range")}
          aria-busy={busy}
          className="w-full rounded-md border bg-muted/40 p-1 shadow-xs sm:w-fit"
        >
          {RANGES.map((range) => (
            <ToggleGroupItem
              key={range.value}
              value={range.value}
              className="h-8 flex-1 px-3 text-xs font-semibold text-muted-foreground data-[state=on]:bg-blue-500/80 data-[state=on]:text-white sm:flex-none"
            >
              {t(range.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {customSelected ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="dashboard-custom-from">
              <Trans>{"Custom range from"}</Trans>
            </label>
            <input
              id="dashboard-custom-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <span className="hidden text-xs text-muted-foreground sm:inline">to</span>
            <label className="sr-only" htmlFor="dashboard-custom-to">
              <Trans>{"Custom range to"}</Trans>
            </label>
            <input
              id="dashboard-custom-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button
              type="button"
              size="sm"
              onClick={applyCustomRange}
              disabled={busy || invalidCustomRange}
              className="h-8 gap-1 rounded-md"
            >
              <CalendarDays className="size-3.5" />
              <Trans>{"Apply"}</Trans>
            </Button>
          </div>
        ) : null}
      </div>

      {busy ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" />
          Updating dashboard range
        </div>
      ) : invalidCustomRange ? (
        <div role="alert" className="text-xs text-destructive">
          Select an end date after the start date.
        </div>
      ) : null}
    </div>
  );
}
