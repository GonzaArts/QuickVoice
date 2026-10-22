"use client";

import { useLocale } from "@/src/i18n/provider";
import { localeCode, formatNumber } from "@/src/i18n/config";

import { Trans } from "@/src/i18n/Trans";
import Link from "next/link";
import { useId, useMemo } from "react";
import { PhoneCall } from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/src/components/ui/chart";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/common/EmptyState";
import type {
  DashboardRange,
  DashboardSeriesPoint,
  DashboardSummary,
} from "@/src/lib/api/resources/dashboard";

const config = {
  calls: {
    label: "Calls",
    color: "#3b82f6",
  },
  minutes: {
    label: "Minutes",
    color: "#64748b",
  },
  failed: {
    label: "Failed",
    color: "#f87171",
  },
} satisfies ChartConfig;

function formatTick(iso: string, range: DashboardRange, locale: string) {
  const d = new Date(iso);
  if (range === "24h") {
    return d.toLocaleTimeString(locale, { hour: "numeric" });
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function totalFor(data: DashboardSeriesPoint[], key: keyof DashboardSeriesPoint) {
  return data.reduce((sum, point) => {
    const value = point[key];
    return typeof value === "number" ? sum + value : sum;
  }, 0);
}

export function VolumeChart({
  summary,
  range,
  loading,
}: {
  summary?: DashboardSummary;
  range: DashboardRange;
  loading?: boolean;
}) {
  const { t: translateUi, locale } = useLocale();
  const titleId = useId();
  const summaryId = useId();
  const bucketUnit = range === "24h" ? "hour" : "day";
  const localizedUnit = translateUi(bucketUnit);
  const chartConfig = useMemo(() => ({
    calls: { ...config.calls, label: translateUi("Calls") },
    minutes: { ...config.minutes, label: translateUi("Minutes") },
    failed: { ...config.failed, label: translateUi("Failed") },
  }), [translateUi]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const data = summary?.series ?? [];
  const peak = data.reduce((max, point) => Math.max(max, point.calls), 0);
  const calls = totalFor(data, "calls");
  const minutes = totalFor(data, "minutes");
  const failedCalls = totalFor(data, "failed");

  return (
    <div
      className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-border/50"
      aria-labelledby={titleId}
    >
      <div className="flex flex-col gap-4 border-b bg-muted/20 p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            <Trans>{"Traffic timeline"}</Trans>
          </p>
          <h3
            id={titleId}
            className="mt-1 text-lg font-semibold tracking-tight text-foreground"
          >
            <Trans>{"Calls, minutes, and outcome pressure"}</Trans>
          </h3>
          <p id={summaryId} className="mt-1 text-sm text-muted-foreground">
            {translateUi("Bucketed by {unit}. X-axis shows {unit}; left axis shows calls and failed calls; right axis shows minutes.", {
              unit: localizedUnit,
            })}
          </p>
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border bg-background/80 text-center text-xs shadow-sm backdrop-blur sm:min-w-96">
          <div className="border-r border-border/70 px-3 py-2.5">
            <p className="font-semibold text-blue-400 tabular-nums">{formatNumber(locale, calls)}</p>
            <p className="text-muted-foreground"><Trans>{"calls"}</Trans></p>
          </div>
          <div className="border-r border-border/70 px-3 py-2.5">
            <p className="font-semibold text-foreground tabular-nums">{formatNumber(locale, minutes)}</p>
            <p className="text-muted-foreground"><Trans>{"minutes"}</Trans></p>
          </div>
          <div className="px-3 py-2.5">
            <p className="font-semibold text-muted-foreground tabular-nums">{formatNumber(locale, peak)}</p>
            <p className="text-muted-foreground"><Trans>{"peak"}</Trans></p>
          </div>
        </div>
      </div>
      {data.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No calls yet in this range"
          description="Place a test call or connect a number to start building the traffic timeline."
          className="m-5 h-80 bg-background/40"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="sm">
                <Link href="/outbound"><Trans>{"Place a test call"}</Trans></Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/numbers"><Trans>{"Connect number"}</Trans></Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <ChartContainer
            config={chartConfig}
            className="h-[22rem] w-full p-5"
            role="group"
            aria-label={translateUi("Traffic timeline chart")}
          >
            <ComposedChart
              accessibilityLayer
              data={data}
              margin={{ top: 12, right: 44, left: 18, bottom: 28 }}
              aria-label={translateUi("Calls, minutes, and failed calls over time")}
              aria-describedby={summaryId}
            >
              <defs>
                <linearGradient
                  id="dashboard-minutes-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-minutes)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-minutes)"
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 6"
                className="stroke-border/70"
                vertical={false}
              />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => formatTick(v, range, localeCode(locale))}
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
                label={{
                  value: translateUi(bucketUnit === "hour" ? "Hour" : "Day"),
                  position: "insideBottom",
                  offset: -18,
                }}
              />
              <YAxis
                yAxisId="left"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={42}
                label={{
                  value: translateUi("Calls by {bucket}", { bucket: localizedUnit }),
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="currentColor"
                className="text-xs text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={48}
                label={{
                  value: translateUi("Minutes (right axis)"),
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => formatTick(String(v), range, localeCode(locale))}
                  />
                }
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="minutes"
                name={translateUi("Minutes (right axis)")}
                stroke="var(--color-minutes)"
                strokeWidth={2.5}
                fill="url(#dashboard-minutes-fill)"
              />
              <Bar
                yAxisId="left"
                dataKey="calls"
                name={translateUi("Calls by {bucket}", { bucket: localizedUnit })}
                fill="var(--color-calls)"
                fillOpacity={0.72}
                barSize={18}
                radius={[6, 6, 2, 2]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="failed"
                name={translateUi("Failed calls")}
                stroke={failedCalls > 0 ? "#f87171" : "hsl(var(--muted-foreground))"}
                strokeWidth={2.5}
                dot={false}
                activeDot={failedCalls > 0 ? { r: 4, strokeWidth: 0 } : false}
              />
            </ComposedChart>
          </ChartContainer>
          <ul
            className="grid gap-2 px-5 pb-5 text-xs text-muted-foreground sm:grid-cols-3"
            aria-label={translateUi("Traffic timeline legend")}
          >
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-4 w-2 rounded-sm border border-blue-500/50 bg-blue-500/70"
              />
              <span>{translateUi("Calls by {bucket} - bar series", { bucket: localizedUnit })}</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-5 rounded-sm border border-slate-500 bg-slate-500/20"
              />
              <span><Trans>{"Minutes (right axis) - shaded area"}</Trans></span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className={failedCalls > 0 ? "h-px w-6 border-t-2 border-red-400/70" : "h-px w-6 border-t-2 border-muted-foreground/60"}
              />
              <span><Trans>{"Failed calls - line series"}</Trans></span>
            </li>
          </ul>
          <div className="sr-only">
            <table aria-describedby={summaryId}>
              <caption><Trans>{"Traffic timeline data table"}</Trans></caption>
              <thead>
                <tr>
                  <th scope="col">{localizedUnit}</th>
                  <th scope="col"><Trans>{"Calls"}</Trans></th>
                  <th scope="col"><Trans>{"Minutes"}</Trans></th>
                  <th scope="col"><Trans>{"Failed calls"}</Trans></th>
                </tr>
              </thead>
              <tbody>
                {data.map((point) => (
                  <tr key={point.t}>
                    <th scope="row">{formatTick(point.t, range, localeCode(locale))}</th>
                    <td>{point.calls}</td>
                    <td>{point.minutes}</td>
                    <td>{point.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
