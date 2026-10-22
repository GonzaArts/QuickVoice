"use client";

import { Trans } from "@/src/i18n/Trans";
import { useLocale } from "@/src/i18n/provider";
import { localeCode } from "@/src/i18n/config";
import Link from "next/link";
import { AlertTriangle, ArrowRight, MoreHorizontal, PhoneCall, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { EmptyState } from "@/src/components/common/EmptyState";
import type { DashboardSummary } from "@/src/lib/api/resources/dashboard";
import { useAgents } from "@/src/hooks/queries/agents";
import type { Agent, CallLog, CallStatus } from "@/src/lib/api/types";

const linkFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function statusVariant(
  status: CallStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "COMPLETED":
    case "IN_PROGRESS":
      return "default";
    case "FAILED":
    case "NOT_ANSWERED":
    case "SCHEDULED":
    case "PROCESSED":
      return "secondary";
    default:
      return "outline";
  }
}

function statusClass(status: CallStatus) {
  switch (status) {
    case "COMPLETED":
      return "border-green-400/20 bg-green-400/8 text-green-400/80";
    case "FAILED":
    case "NOT_ANSWERED":
      return "border-border bg-muted/40 text-muted-foreground";
    case "IN_PROGRESS":
      return "border-sky-500/20 bg-sky-500/10 text-sky-500";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function formatAbsoluteTimestamp(iso: string | null, locale = "en-US") {
  if (!iso) return "No start timestamp";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Invalid timestamp";

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "Unknown";
  const safeSeconds = Math.max(0, seconds);
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatStatus(status: string) {
  return status.toLowerCase().replace("_", " ");
}

function metadataText(call: CallLog, key: "fromNumber" | "toNumber") {
  const value = call.metadata?.[key];
  return typeof value === "string" && value.trim().length ? value : null;
}

function callParties(call: CallLog) {
  const fromNumber = metadataText(call, "fromNumber");
  const toNumber = metadataText(call, "toNumber");

  if (call.direction === "inbound") {
    return {
      caller: fromNumber ?? call.callerId ?? "Unknown caller",
      callee: toNumber ?? "Unknown callee",
    };
  }

  if (call.direction === "outbound") {
    return {
      caller: fromNumber ?? "Unknown caller",
      callee: toNumber ?? call.callerId ?? "Unknown callee",
    };
  }

  return {
    caller: fromNumber ?? call.callerId ?? "Unknown caller",
    callee: toNumber ?? "Unknown callee",
  };
}

function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function primaryNumber(call: CallLog, parties: ReturnType<typeof callParties>) {
  if (call.direction === "outbound") return parties.callee;
  return parties.caller;
}

function directionClasses(direction: CallLog["direction"]) {
  if (direction === "inbound" || direction === "outbound") {
    return "border-border bg-muted/40 text-muted-foreground";
  }
  return "border-border bg-muted/40 text-muted-foreground";
}

function resolveAgentLabel({
  call,
  agents,
  agentsLoading,
  agentsError,
}: {
  call: CallLog;
  agents?: Agent[];
  agentsLoading: boolean;
  agentsError: boolean;
}) {
  if (!call.agentId) return "Unassigned";
  if (agentsLoading) return "Resolving agent";
  if (agentsError) return "Agent name unavailable";
  return agents?.find((agent) => agent.agentId === call.agentId)?.name ?? "Unknown agent";
}

function CallTimestamp({ call }: { call: CallLog }) {
  const {locale} = useLocale();
  return call.startTime ? (
    <time dateTime={call.startTime}>{formatAbsoluteTimestamp(call.startTime, localeCode(locale))}</time>
  ) : (
    <span><Trans>{"No start timestamp"}</Trans></span>
  );
}

export function RecentCallsTable({
  summary,
  loading,
}: {
  summary?: DashboardSummary;
  loading?: boolean;
}) {
  const {t} = useLocale();
  const {
    data: agents,
    isLoading: agentsLoading,
    isError: agentsError,
  } = useAgents();
  const hasAgentLookupGap =
    agentsError && Boolean(summary?.recent.some((call) => call.agentId));

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            <Trans>{"Recent activity"}</Trans>
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            <Trans>{"Recent call logs"}</Trans>
          </h3>
          <p className="text-xs text-muted-foreground">
            <Trans>{"Latest call log activity across all agents."}</Trans>
          </p>
        </div>
        <Link
          href="/calls"
          className={`inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:underline ${linkFocusClass}`}
        >
          <Trans>{"View call logs"}</Trans> <ArrowRight className="size-3" />
        </Link>
      </div>
      {hasAgentLookupGap ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 border-b bg-muted/40 px-5 py-3 text-xs text-muted-foreground"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold"><Trans>{"Partial call log data:"}</Trans></span>{" "}
            <Trans>{"recent call logs loaded, but agent names could not be resolved. Open a call detail for the full source record."}</Trans>
          </span>
        </div>
      ) : null}
      {loading ? (
        <div className="space-y-2 p-5">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !summary?.recent.length ? (
        <EmptyState
          icon={PhoneCall}
          title="No call logs yet"
          description="Start with a test call or connect a number so recent call log activity has source records to show."
          className="border-0"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="sm">
                <Link href="/outbound"><Trans>{"Start with a test call"}</Trans></Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/numbers"><Trans>{"Connect number"}</Trans></Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="divide-y md:divide-y-0">
          <ul className="divide-y md:hidden">
            {summary.recent.map((call) => {
              const parties = callParties(call);
              const agentLabel = resolveAgentLabel({
                call,
                agents,
                agentsLoading,
                agentsError,
              });

              return (
                <li key={call.callId}>
                  <Link
                    href={`/calls/${call.callId}`}
                    aria-label={t("Open call {id}: {caller} to {callee}", { id: call.callId, caller: parties.caller, callee: parties.callee })}
                    className={`group block px-5 py-4 transition-colors hover:bg-muted/40 ${linkFocusClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          <CallTimestamp call={call} />
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-foreground">
                          {parties.caller}
                        </p>
                      </div>
                      <Badge
                        variant={statusVariant(call.status)}
                        className={`w-fit shrink-0 capitalize ${statusClass(call.status)}`}
                      >
                        {t(formatStatus(call.status))}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <dt className="text-muted-foreground"><Trans>{"Callee"}</Trans></dt>
                        <dd className="truncate font-medium text-foreground">
                          {parties.callee}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground"><Trans>{"Agent"}</Trans></dt>
                        <dd className="truncate font-medium text-foreground">
                          {agentLabel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground"><Trans>{"Duration"}</Trans></dt>
                        <dd className="font-medium text-foreground">
                          {formatDuration(call.durationSeconds)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground"><Trans>{"Direction"}</Trans></dt>
                        <dd className="font-medium capitalize text-foreground">
                          {call.direction ?? <Trans>{"unknown"}</Trans>}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1120px] border-collapse">
              <TableCaption className="sr-only">
                <Trans>{"Recent call logs with absolute timestamps, phone number, assigned agent, duration, direction, status, and actions."}</Trans>
              </TableCaption>
              <TableHeader>
                <TableRow className="border-b bg-background/70 hover:bg-background/70">
                  <TableHead className="h-11 pl-5 text-xs font-semibold text-foreground">
                    <Trans>{"Start Time"}</Trans>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">
                    <Trans>{"Number"}</Trans>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">
                    <Trans>{"Agent"}</Trans>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">
                    <Trans>{"Duration"}</Trans>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">
                    <Trans>{"Direction"}</Trans>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">
                    <Trans>{"Status"}</Trans>
                  </TableHead>
                  <TableHead className="pr-5 text-right text-xs font-semibold text-foreground">
                    <Trans>{"Actions"}</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recent.map((call) => {
                  const parties = callParties(call);
                  const agentLabel = resolveAgentLabel({
                    call,
                    agents,
                    agentsLoading,
                    agentsError,
                  });
                  const number = primaryNumber(call, parties);
                  const DirectionIcon =
                    call.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;

                  return (
                    <TableRow
                      key={call.callId}
                      className="border-b border-border/70 bg-card transition-colors hover:bg-muted/25"
                    >
                      <TableCell className="h-13 pl-5 align-middle text-sm text-muted-foreground">
                        <CallTimestamp call={call} />
                      </TableCell>
                      <TableCell className="align-middle">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {number}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[220px] align-middle">
                        <p className="truncate text-sm text-muted-foreground">
                          {agentLabel}
                        </p>
                        <span className="sr-only">
                          {call.agentId ? `ID ${shortId(call.agentId)}` : <Trans>{"No agent assigned"}</Trans>}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle text-sm font-semibold tabular-nums text-foreground">
                        {formatDuration(call.durationSeconds)}
                      </TableCell>
                      <TableCell className="align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium capitalize ${directionClasses(call.direction)}`}
                        >
                          <DirectionIcon className="size-3.5" aria-hidden="true" />
                          {call.direction ?? <Trans>{"unknown"}</Trans>}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge
                          variant={statusVariant(call.status)}
                          className={`w-fit shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(call.status)}`}
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right align-middle">
                        <Link
                          href={`/calls/${call.callId}`}
                          aria-label={t("Open call {id}: {caller} to {callee}", { id: call.callId, caller: parties.caller, callee: parties.callee })}
                          className={`inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${linkFocusClass}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
