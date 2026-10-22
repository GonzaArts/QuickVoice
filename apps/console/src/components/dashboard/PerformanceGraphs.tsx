"use client";

import { useLocale } from "@/src/i18n/provider";
import { localeCode, formatNumber } from "@/src/i18n/config";

import { Trans } from "@/src/i18n/Trans";
import Link from "next/link";
import { useId, useMemo, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { dashboardCallsHref } from "@/src/components/dashboard/call-filter-links";
import type {
  DashboardRange,
  DashboardSeriesPoint,
  DashboardSummary,
} from "@/src/lib/api/resources/dashboard";

const successConfig = {
  successRate: { label: "Success rate", color: "var(--chart-1)" },
} satisfies ChartConfig;

const exceptionConfig = {
  failed: { label: "Failed", color: "var(--destructive)" },
  missed: { label: "Missed", color: "var(--chart-3)" },
} satisfies ChartConfig;

const efficiencyConfig = {
  calls: { label: "Calls", color: "var(--chart-1)" },
  minutesPerCall: { label: "Minutes per call", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatTick(iso: string, range: DashboardRange, locale: string) {
  const date = new Date(iso);
  if (range === "24h") return date.toLocaleTimeString(locale, { hour: "numeric" });
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function formatSuccess(value: number) {
  return `${Math.round(value)}%`;
}

function buildGraphData(series: DashboardSeriesPoint[]) {
  return series.map((point) => ({
    ...point,
    successRate: Math.round(point.successRate * 100),
    exceptions: point.failed + point.missed,
    minutesPerCall: point.calls
      ? Number((point.minutes / point.calls).toFixed(1))
      : 0,
  }));
}

function GraphCard({
  eyebrow,
  title,
  description,
  metric,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-4 border-b bg-muted/20 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border bg-background px-3 py-2 text-right shadow-xs">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {metric}
          </p>
          <p className="text-xs text-muted-foreground"><Trans>{"current"}</Trans></p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function PerformanceGraphs({
  summary,
  range,
  loading,
  customFrom,
  customTo,
}: {
  summary?: DashboardSummary;
  range: DashboardRange;
  loading?: boolean;
  customFrom?: string;
  customTo?: string;
}) {
  const { locale, t: translateUi } = useLocale();
  const successSummaryId = useId();
  const exceptionSummaryId = useId();
  const efficiencySummaryId = useId();
  const localizedCharts = useMemo(() => ({
    success: {
      successRate: { ...successConfig.successRate, label: translateUi("Success rate") },
    },
    exception: {
      failed: { ...exceptionConfig.failed, label: translateUi("Failed") },
      missed: { ...exceptionConfig.missed, label: translateUi("Missed") },
    },
    efficiency: {
      calls: { ...efficiencyConfig.calls, label: translateUi("Calls") },
      minutesPerCall: { ...efficiencyConfig.minutesPerCall, label: translateUi("Minutes per call") },
    },
  }), [translateUi]);

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="rounded-lg border bg-card p-5 shadow-sm">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-4 w-52" />
            <Skeleton className="mt-5 h-56 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const data = buildGraphData(summary?.series ?? []);
  const latest = data[data.length - 1];
  const totalExceptions = data.reduce((sum, point) => sum + point.exceptions, 0);
  const avgMinutesPerCall = data.length
    ? data.reduce((sum, point) => sum + point.minutesPerCall, 0) / data.length
    : 0;

  if (!data.length) {
    return (
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <EmptyState
          icon={BarChart3}
          title="No performance graph data yet"
          description="Run a test call or connect a number to populate success, exception, and efficiency charts."
          className="border-0 bg-background/40"
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
      </section>
    );
  }

  return (
    <div
      className="grid gap-4 xl:grid-cols-3"
      aria-label={translateUi("Performance analytics graphs")}
    >
      <GraphCard
        eyebrow={translateUi("Quality")}
        title={translateUi("Success trend")}
        description={translateUi("Completion quality over the selected reporting window.")}
        metric={latest ? `${latest.successRate}%` : "0%"}
      >
        <ChartContainer
          config={localizedCharts.success}
          className="h-64 w-full p-5"
          role="group"
          aria-label={translateUi("Success rate trend chart")}
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 16, left: 4, bottom: 20 }}
            aria-describedby={successSummaryId}
          >
            <defs>
              <linearGradient
                id="dashboard-success-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-successRate)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-successRate)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} className="stroke-border" />
            <XAxis
              dataKey="t"
              tickFormatter={(value) => formatTick(value, range, localeCode(locale))}
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={formatSuccess}
              tickLine={false}
              axisLine={false}
              width={42}
              className="text-xs text-muted-foreground"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTick(String(value), range, localeCode(locale))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="successRate"
              name="Success rate"
              stroke="var(--color-successRate)"
              strokeWidth={2}
              fill="url(#dashboard-success-fill)"
              isAnimationActive
            />
          </AreaChart>
        </ChartContainer>
        <div className="sr-only">
          <p id={successSummaryId}>
            <Trans>{"Success rate trend across the selected dashboard range."}</Trans>
          </p>
          <table aria-describedby={successSummaryId}>
            <caption><Trans>{"Success rate trend data table"}</Trans></caption>
            <thead>
              <tr>
                <th scope="col"><Trans>{"Time bucket"}</Trans></th>
                <th scope="col"><Trans>{"Success rate"}</Trans></th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.t}>
                  <th scope="row">{formatTick(point.t, range, localeCode(locale))}</th>
                  <td>{point.successRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GraphCard>

      <GraphCard
        eyebrow={translateUi("Risk")}
        title={translateUi("Exception pressure")}
        description={translateUi("Failed and missed calls stacked by time bucket.")}
        metric={formatNumber(locale, totalExceptions)}
      >
        <ChartContainer
          config={localizedCharts.exception}
          className="h-64 w-full p-5"
          role="group"
          aria-label={translateUi("Exception pressure stacked bar chart")}
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 16, left: 4, bottom: 20 }}
            aria-describedby={exceptionSummaryId}
          >
            <CartesianGrid vertical={false} className="stroke-border" />
            <XAxis
              dataKey="t"
              tickFormatter={(value) => formatTick(value, range, localeCode(locale))}
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={34}
              className="text-xs text-muted-foreground"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTick(String(value), range, localeCode(locale))}
                />
              }
            />
            <Bar
              dataKey="failed"
              name={translateUi("Failed")}
              stackId="exceptions"
              fill="var(--color-failed)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="missed"
              name={translateUi("Missed")}
              stackId="exceptions"
              fill="var(--color-missed)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="size-3 text-destructive" />
            <Trans>{"Failed + missed call buckets"}</Trans>
          </span>
          <Link
            href={dashboardCallsHref({ range, status: "FAILED", from: customFrom, to: customTo })}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Trans>{"Review failed"}</Trans> <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="sr-only">
          <p id={exceptionSummaryId}>
            <Trans>{"Failed and missed call counts stacked over time."}</Trans>
          </p>
          <table aria-describedby={exceptionSummaryId}>
            <caption><Trans>{"Exception pressure data table"}</Trans></caption>
            <thead>
              <tr>
                <th scope="col"><Trans>{"Time bucket"}</Trans></th>
                <th scope="col"><Trans>{"Failed calls"}</Trans></th>
                <th scope="col"><Trans>{"Missed calls"}</Trans></th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.t}>
                  <th scope="row">{formatTick(point.t, range, localeCode(locale))}</th>
                  <td>{point.failed}</td>
                  <td>{point.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GraphCard>

      <GraphCard
        eyebrow={translateUi("Efficiency")}
        title={translateUi("Conversation efficiency")}
        description={translateUi("Calls compared with average minutes consumed per call.")}
        metric={formatNumber(locale, avgMinutesPerCall, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " min"}
      >
        <ChartContainer
          config={localizedCharts.efficiency}
          className="h-64 w-full p-5"
          role="group"
          aria-label={translateUi("Conversation efficiency line chart")}
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 16, left: 4, bottom: 20 }}
            aria-describedby={efficiencySummaryId}
          >
            <CartesianGrid vertical={false} className="stroke-border" />
            <XAxis
              dataKey="t"
              tickFormatter={(value) => formatTick(value, range, localeCode(locale))}
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={34}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={42}
              className="text-xs text-muted-foreground"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTick(String(value), range, localeCode(locale))}
                />
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="calls"
              name={translateUi("Calls")}
              stroke="var(--color-calls)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="minutesPerCall"
              name={translateUi("Minutes per call")}
              stroke="var(--color-minutesPerCall)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        </ChartContainer>
        <div className="sr-only">
          <p id={efficiencySummaryId}>
            <Trans>{"Calls and average minutes per call plotted over the selected range."}</Trans>
          </p>
          <table aria-describedby={efficiencySummaryId}>
            <caption><Trans>{"Conversation efficiency data table"}</Trans></caption>
            <thead>
              <tr>
                <th scope="col"><Trans>{"Time bucket"}</Trans></th>
                <th scope="col"><Trans>{"Calls"}</Trans></th>
                <th scope="col"><Trans>{"Minutes per call"}</Trans></th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.t}>
                  <th scope="row">{formatTick(point.t, range, localeCode(locale))}</th>
                  <td>{point.calls}</td>
                  <td>{point.minutesPerCall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GraphCard>
    </div>
  );
}
