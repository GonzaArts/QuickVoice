"use client";

import { useT } from "@/src/i18n/provider";

import { Trans } from "@/src/i18n/Trans";
import { useId } from "react";
import Link from "next/link";
import { ArrowRight, PhoneCall } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/common/EmptyState";
import { dashboardCallsHref } from "@/src/components/dashboard/call-filter-links";
import type {
  DashboardRange,
  DashboardSummary,
} from "@/src/lib/api/resources/dashboard";

const directionStyles = {
  inbound: {
    label: "Inbound",
    color: "#64748b",
    accentClass: "bg-slate-500",
    textClass: "text-muted-foreground",
    surfaceClass: "border-border bg-muted/25",
  },
  outbound: {
    label: "Outbound",
    color: "#3b82f6",
    accentClass: "bg-blue-500/70",
    textClass: "text-blue-400",
    surfaceClass: "border-border bg-muted/25",
  },
  unknown: {
    label: "Unknown",
    color: "#64748b",
    accentClass: "bg-slate-500",
    textClass: "text-muted-foreground",
    surfaceClass: "border-border bg-muted/25",
  },
};

const statusStyles: Record<
  string,
  {
    label: string;
    color: string;
    accentClass: string;
    textClass: string;
    surfaceClass: string;
  }
> = {
  COMPLETED: {
    label: "Completed",
    color: "#4ade80",
    accentClass: "bg-green-400/55",
    textClass: "text-green-400/80",
    surfaceClass: "border-border bg-muted/25",
  },
  FAILED: {
    label: "Failed",
    color: "#f87171",
    accentClass: "bg-red-400/55",
    textClass: "text-red-400/80",
    surfaceClass: "border-red-400/25 bg-red-400/8",
  },
  NOT_ANSWERED: {
    label: "Missed",
    color: "#f59e0b",
    accentClass: "bg-amber-500/80",
    textClass: "text-amber-500",
    surfaceClass: "border-amber-500/25 bg-amber-500/5",
  },
  IN_PROGRESS: {
    label: "In progress",
    color: "#3b82f6",
    accentClass: "bg-blue-500/70",
    textClass: "text-blue-400",
    surfaceClass: "border-border bg-muted/25",
  },
  SCHEDULED: {
    label: "Scheduled",
    color: "#64748b",
    accentClass: "bg-slate-500",
    textClass: "text-muted-foreground",
    surfaceClass: "border-border bg-muted/25",
  },
  PROCESSED: {
    label: "Processed",
    color: "#3b82f6",
    accentClass: "bg-blue-500/70",
    textClass: "text-blue-400",
    surfaceClass: "border-border bg-muted/25",
  },
};

const statusPattern: Record<string, string> = {
  COMPLETED: "solid bar",
  FAILED: "dashed bar",
  NOT_ANSWERED: "dotted bar",
  IN_PROGRESS: "striped bar",
  SCHEDULED: "outlined bar",
  PROCESSED: "double-line bar",
};

const directionPattern = {
  inbound: "filled segment",
  outbound: "outlined segment",
  unknown: "dashed segment",
};

function labelStatus(status: string) {
  return statusStyles[status]?.label ?? status.toLowerCase().replace("_", " ");
}

function percent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

export function BreakdownCharts({
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
  const translateUi = useT();
  const statusTitleId = useId();
  const statusSummaryId = useId();
  const directionTitleId = useId();
  const directionSummaryId = useId();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const statusData = summary?.statusBreakdown.filter((item) => item.count > 0) ?? [];
  const directionData =
    summary?.directionBreakdown.filter((item) => item.count > 0) ?? [];
  const totalStatus = statusData.reduce((sum, item) => sum + item.count, 0);
  const inbound =
    directionData.find((item) => item.direction === "inbound")?.count ?? 0;
  const outbound =
    directionData.find((item) => item.direction === "outbound")?.count ?? 0;
  const directionTotal = directionData.reduce((sum, item) => sum + item.count, 0);
  const inboundPct = directionTotal
    ? Math.round((inbound / directionTotal) * 100)
    : 0;
  const outboundPct = directionTotal
    ? Math.round((outbound / directionTotal) * 100)
    : 0;
  const completedCalls =
    statusData.find((item) => item.status === "COMPLETED")?.count ?? 0;
  const completionPct = percent(completedCalls, totalStatus);
  const statusChartData = statusData.map((item) => ({
    ...item,
    label: translateUi(labelStatus(item.status)),
    pattern: translateUi(statusPattern[item.status] ?? "solid bar"),
    percentage: percent(item.count, totalStatus),
    style: statusStyles[item.status] ?? statusStyles.PROCESSED,
  }));
  const directionChartData = directionData.map((item) => ({
    ...item,
    label: translateUi(directionStyles[item.direction].label),
    pattern: translateUi(directionPattern[item.direction]),
    percentage: percent(item.count, directionTotal),
    style: directionStyles[item.direction],
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div
        className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-border/50"
        aria-labelledby={statusTitleId}
      >
        <div className="flex flex-col gap-4 border-b bg-muted/20 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              <Trans>{"Outcomes"}</Trans>
            </p>
            <h3
              id={statusTitleId}
              className="mt-1 text-base font-semibold text-foreground"
            >
              <Trans>{"Call outcomes"}</Trans>
            </h3>
            <p id={statusSummaryId} className="text-xs text-muted-foreground">
              <Trans>{"Status distribution for the selected range by count and share of calls."}</Trans>
            </p>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-background/80 text-center text-xs shadow-sm backdrop-blur sm:min-w-56">
            <div className="border-r border-border/70 px-3 py-2.5">
              <p className="font-semibold text-foreground tabular-nums">
                {totalStatus}
              </p>
              <p className="text-muted-foreground"><Trans>{"tracked"}</Trans></p>
            </div>
            <div className="px-3 py-2.5">
              <p className="font-semibold text-green-400/80 tabular-nums">
                {completionPct}%
              </p>
              <p className="text-muted-foreground"><Trans>{"completed"}</Trans></p>
            </div>
          </div>
        </div>
        {statusData.length ? (
          <div
            className="space-y-5 p-5"
            role="group"
            aria-label={translateUi("Call outcome status breakdown chart")}
            aria-describedby={statusSummaryId}
          >
            <div className="rounded-xl border bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-muted-foreground">
                  <Trans>{"Outcome share"}</Trans>
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {totalStatus} <Trans>{"total"}</Trans>
                </span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                {statusChartData.map((item) => (
                  <div
                    key={item.status}
                    className="h-full transition-all duration-500 motion-safe:animate-in motion-safe:fade-in-0"
                    style={{
                      width: `${item.percentage}%`,
                      background: item.style.color,
                    }}
                    title={`${item.label}: ${item.percentage}%`}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {statusChartData.map((item, index) => (
                <Link
                  key={item.status}
                  href={dashboardCallsHref({ range, status: item.status, from: customFrom, to: customTo })}
                  className={`group rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 ${item.style.surfaceClass}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                  aria-label={translateUi("Review {status} calls in the selected dashboard range", { status: translateUi(labelStatus(item.status)) })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`size-2.5 shrink-0 rounded-full ${item.style.accentClass}`}
                        />
                        <span className="truncate text-sm font-semibold text-foreground">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                        {item.count}
                      </p>
                    </div>
                    <span className={`rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold shadow-xs ${item.style.textClass}`}>
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.style.accentClass}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {item.pattern}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-medium ${item.style.textClass}`}>
                      <Trans>{"Review"}</Trans>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="sr-only">
              <table aria-describedby={statusSummaryId}>
                <caption><Trans>{"Call outcome status breakdown data table"}</Trans></caption>
                <thead>
                  <tr>
                    <th scope="col"><Trans>{"Status"}</Trans></th>
                    <th scope="col"><Trans>{"Calls"}</Trans></th>
                    <th scope="col"><Trans>{"Percentage of calls"}</Trans></th>
                    <th scope="col"><Trans>{"Legend pattern"}</Trans></th>
                  </tr>
                </thead>
                <tbody>
                  {statusChartData.map((item) => (
                    <tr key={item.status}>
                      <th scope="row">{item.label}</th>
                      <td>{item.count}</td>
                      <td>{item.percentage}%</td>
                      <td>{item.pattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={PhoneCall}
            title="No outcomes yet"
            description="Place a test call to confirm completion, failed, and missed call states are flowing into reporting."
            className="m-5 h-64 bg-background/40"
            action={
              <Button asChild size="sm">
                <Link href="/outbound"><Trans>{"Place a test call"}</Trans></Link>
              </Button>
            }
          />
        )}
      </div>
      <div
        className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-border/50"
        aria-labelledby={directionTitleId}
      >
        <div className="flex min-w-0 flex-col gap-4 border-b bg-muted/20 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              <Trans>{"Routing"}</Trans>
            </p>
            <h3
              id={directionTitleId}
              className="mt-1 text-base font-semibold text-foreground"
            >
              <Trans>{"Direction mix"}</Trans>
            </h3>
            <p id={directionSummaryId} className="text-xs text-muted-foreground">
              <Trans>{"Inbound and outbound call composition by count and share of routed calls."}</Trans>
            </p>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-background/80 text-center text-xs shadow-sm backdrop-blur sm:min-w-56">
            <div className="border-r border-border/70 px-3 py-2.5">
              <p className="font-semibold tabular-nums text-muted-foreground">
                {inboundPct}%
              </p>
              <p className="text-muted-foreground"><Trans>{"inbound"}</Trans></p>
            </div>
            <div className="px-3 py-2.5">
              <p className="font-semibold tabular-nums text-blue-400">
                {outboundPct}%
              </p>
              <p className="text-muted-foreground"><Trans>{"outbound"}</Trans></p>
            </div>
          </div>
        </div>
        {directionData.length ? (
          <div
            className="space-y-5 p-5"
            role="group"
            aria-label={translateUi("Inbound and outbound direction mix chart")}
            aria-describedby={directionSummaryId}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      <Trans>{"Inbound calls"}</Trans>
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-muted-foreground tabular-nums">
                      {inbound}
                    </p>
                  </div>
                  <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-xs">
                    {inboundPct}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70">
                  <div
                    className="h-full rounded-full bg-slate-500"
                    style={{ width: `${inboundPct}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      <Trans>{"Outbound calls"}</Trans>
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-blue-400 tabular-nums">
                      {outbound}
                    </p>
                  </div>
                  <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold text-blue-400 shadow-xs">
                    {outboundPct}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70">
                  <div
                    className="h-full rounded-full bg-blue-500/70"
                    style={{ width: `${outboundPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-muted-foreground">
                  <Trans>{"Routed call share"}</Trans>
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {directionTotal} <Trans>{"total"}</Trans>
                </span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                {directionChartData.map((item) => (
                  <div
                    key={item.direction}
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${item.percentage}%`,
                      background: item.style.color,
                    }}
                    title={`${item.label}: ${item.percentage}%`}
                  />
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                {directionChartData.map((item) => (
                  <div
                    key={item.direction}
                    className={`rounded-lg border p-3 ${item.style.surfaceClass}`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className={`size-2.5 shrink-0 rounded-full ${item.style.accentClass}`}
                        />
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {item.count}
                        </p>
                        <p className={`text-xs font-medium ${item.style.textClass}`}>
                          {item.percentage}%
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <Trans>{"Percentage of routed calls,"}</Trans> {item.pattern}.
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="sr-only">
              <table aria-describedby={directionSummaryId}>
                <caption><Trans>{"Inbound and outbound direction mix data table"}</Trans></caption>
                <thead>
                  <tr>
                    <th scope="col"><Trans>{"Direction"}</Trans></th>
                    <th scope="col"><Trans>{"Calls"}</Trans></th>
                    <th scope="col"><Trans>{"Percentage of routed calls"}</Trans></th>
                    <th scope="col"><Trans>{"Legend pattern"}</Trans></th>
                  </tr>
                </thead>
                <tbody>
                  {directionChartData.map((item) => (
                    <tr key={item.direction}>
                      <th scope="row">{item.label}</th>
                      <td>{item.count}</td>
                      <td>{item.percentage}%</td>
                      <td>{item.pattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ArrowRight}
            title="No routing data yet"
            description="Connect a number or place a test call to see inbound and outbound routing mix."
            className="m-5 h-64 bg-background/40"
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild size="sm">
                  <Link href="/numbers"><Trans>{"Connect a number"}</Trans></Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/outbound"><Trans>{"Place a test call"}</Trans></Link>
                </Button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
