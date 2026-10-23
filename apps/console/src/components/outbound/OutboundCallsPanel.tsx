"use client";

import { useT } from "@/src/i18n/provider";
import { useLocale } from "@/src/i18n/provider";
import { localeCode } from "@/src/i18n/config";
import { localizeError } from "@/src/i18n/errors";

import { Trans } from "@/src/i18n/Trans";
import { useMemo, useState } from "react";
import {
  Download,
  Loader2,
  MoreHorizontal,
  PhoneCall,
  PhoneOutgoing,
  RefreshCw,
  RotateCcw,
  Search,
  SquareX,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/src/components/common/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useAgents } from "@/src/hooks/queries/agents";
import {
  useCancelOutboundCall,
  useOutboundCall,
  useOutboundCalls,
  useRetryOutboundCall,
} from "@/src/hooks/queries/outbound";
import type { OutboundCall } from "@/src/lib/api/resources/outbound";
import type { CallStatus } from "@/src/lib/api/types";
import { downloadRowsAsCsv } from "@/src/lib/export-csv";

const STATUS_OPTIONS: Array<"all" | CallStatus> = [
  "all",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "NOT_ANSWERED",
  "PROCESSED",
];

function statusLabel(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    SCHEDULED: "Scheduled", IN_PROGRESS: "In progress", COMPLETED: "Completed",
    FAILED: "Failed", NOT_ANSWERED: "Not answered", PROCESSED: "Processed",
    PENDING: "Pending", CANCELLED: "Cancelled", QUEUED: "Queued",
  };
  return labels[status] ? t(labels[status]) : status.replaceAll("_", " ").toLowerCase();
}

function fmtDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale.startsWith("en"),
  });
}

function fmtDuration(seconds: number | null | undefined) {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function statusVariant(status: CallStatus) {
  if (status === "FAILED" || status === "NOT_ANSWERED") return "destructive" as const;
  if (status === "COMPLETED") return "default" as const;
  if (status === "IN_PROGRESS") return "secondary" as const;
  return "outline" as const;
}

function canCancel(call: OutboundCall) {
  return call.status === "SCHEDULED";
}

function canRetry(call: OutboundCall) {
  return call.status === "FAILED" || call.status === "NOT_ANSWERED";
}

function downloadOutboundCsv(calls: OutboundCall[], agentName: (id: string | null) => string) {
  downloadRowsAsCsv("quickvoice-outbound-calls.csv", calls, [
    { header: "Outbound ID", value: (call) => call.outboundId },
    { header: "Status", value: (call) => call.status },
    { header: "Mode", value: (call) => call.mode },
    { header: "Agent", value: (call) => agentName(call.agentId) },
    { header: "To number", value: (call) => call.phoneNumber },
    { header: "From number", value: (call) => call.fromNumber },
    { header: "Scheduled at", value: (call) => call.scheduledAt ?? "" },
    { header: "Created at", value: (call) => call.createdAt },
    {
      header: "Failure reason",
      value: (call) => call.failureReason ?? call.cancellationReason ?? "",
    },
  ]);
}

function OutboundCallDetailDialog({
  call,
  onOpenChange,
}: {
  call: OutboundCall | null;
  onOpenChange: (open: boolean) => void;
}) {
  const translateUi = useT();
  const { locale } = useLocale();
  const { data: detail, isLoading } = useOutboundCall(call?.outboundId);
  const shown = detail ?? call;

  return (
    <Dialog open={!!call} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle><Trans>{"Outbound call"}</Trans></DialogTitle>
          <DialogDescription>
            <Trans>{"Call destination, dispatch status, and prompt overrides."}</Trans>
          </DialogDescription>
        </DialogHeader>

        {isLoading || !shown ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"Status"}</Trans></p>
                <Badge className="mt-2" variant={statusVariant(shown.status)}>
                  {statusLabel(shown.status, translateUi)}
                </Badge>
              </div>
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"Mode"}</Trans></p>
                <p className="mt-1 font-medium">{translateUi(shown.mode === "campaign" ? "Campaign" : "Quick")}</p>
              </div>
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"Duration"}</Trans></p>
                <p className="mt-1 font-medium tabular-nums">
                  {fmtDuration(shown.callLog?.durationSeconds)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"To"}</Trans></p>
                <p className="mt-1 font-mono text-xs">{shown.phoneNumber}</p>
              </div>
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"From"}</Trans></p>
                <p className="mt-1 font-mono text-xs">{shown.fromNumber}</p>
              </div>
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"Scheduled"}</Trans></p>
                <p className="mt-1 font-medium">{fmtDate(shown.scheduledAt, localeCode(locale))}</p>
              </div>
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"Updated"}</Trans></p>
                <p className="mt-1 font-medium">{fmtDate(shown.updatedAt, localeCode(locale))}</p>
              </div>
            </div>

            {shown.failureReason || shown.cancellationReason ? (
              <div className="border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {localizeError(translateUi, shown.failureReason ?? shown.cancellationReason, "The outbound call could not be completed.")}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"First message"}</Trans></p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {shown.firstMessage || "-"}
                </p>
              </div>
              <div className="border p-3">
                <p className="text-xs text-muted-foreground"><Trans>{"System prompt override"}</Trans></p>
                <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-sm">
                  {shown.systemPrompt || "-"}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OutboundCallsPanel() {
  const translateUi = useT();
  const { locale } = useLocale();
  const { data: agents = [] } = useAgents();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | CallStatus>("all");
  const [mode, setMode] = useState<"all" | "quick" | "campaign">("all");
  const [selectedCall, setSelectedCall] = useState<OutboundCall | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OutboundCall | null>(null);
  const retryCall = useRetryOutboundCall();
  const cancelCall = useCancelOutboundCall();

  const params = useMemo(
    () => ({
      limit: 100,
      ...(status !== "all" ? { status } : {}),
      ...(mode !== "all" ? { mode } : {}),
    }),
    [mode, status]
  );
  const { data, isLoading, isError, isFetching, refetch } = useOutboundCalls(params);
  const calls = useMemo(() => data?.items ?? [], [data?.items]);

  const agentNames = useMemo(
    () => new Map(agents.map((agent) => [agent.agentId, agent.name])),
    [agents]
  );

  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return calls;
    return calls.filter((call) =>
      [
        call.outboundId,
        call.phoneNumber,
        call.fromNumber,
        call.status,
        call.mode,
        agentNames.get(call.agentId ?? "") ?? "-",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [agentNames, calls, search]);

  async function confirmCancel() {
    try {
      if (!cancelTarget) return;
      await cancelCall.mutateAsync(cancelTarget.outboundId, {
        onSuccess: () => setCancelTarget(null),
      });
    } catch {
      // The mutation hook displays the API error; preserve the current state for retry.
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={PhoneOutgoing}
        title="Could not load outbound calls"
        description="Refresh outbound calls or try again after checking your connection."
        action={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "animate-spin" : undefined} />
            <Trans>{"Retry"}</Trans>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={translateUi("Search calls, numbers, agents, or status")}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((item) => (
              <SelectItem key={item} value={item} className="capitalize">
              {item === "all" ? <Trans>{"All statuses"}</Trans> : statusLabel(item, translateUi)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"><Trans>{"All modes"}</Trans></SelectItem>
            <SelectItem value="quick"><Trans>{"Quick"}</Trans></SelectItem>
            <SelectItem value="campaign"><Trans>{"Campaign"}</Trans></SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            downloadOutboundCsv(filteredCalls, (id) => agentNames.get(id ?? "") ?? "-");
            toast.success(translateUi("Outbound export downloaded"));
          }}
          disabled={!filteredCalls.length}
        >
          <Download className="size-4" />
          <Trans>{"Export CSV"}</Trans>
        </Button>
      </div>

      {!filteredCalls.length ? (
        <EmptyState
          icon={PhoneOutgoing}
          title="No outbound calls found"
          description="Start a quick call, create a batch campaign, or adjust the current filters."
        />
      ) : (
        <div className="border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Trans>{"Call"}</Trans></TableHead>
                <TableHead><Trans>{"Status"}</Trans></TableHead>
                <TableHead><Trans>{"Agent"}</Trans></TableHead>
                <TableHead><Trans>{"Scheduled"}</Trans></TableHead>
                <TableHead><Trans>{"Duration"}</Trans></TableHead>
                <TableHead className="w-12 text-right"><Trans>{"Actions"}</Trans></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls.map((call) => (
                <TableRow key={call.outboundId}>
                  <TableCell>
                    <div className="min-w-64 space-y-1">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="size-4 text-muted-foreground" />
                        <p className="font-mono text-xs">{call.phoneNumber}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Trans>{"From"}</Trans> {call.fromNumber} · {translateUi(call.mode === "campaign" ? "Campaign" : "Quick")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(call.status)}>
                      {statusLabel(call.status, translateUi)}
                    </Badge>
                  </TableCell>
                  <TableCell>{agentNames.get(call.agentId ?? "") ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDate(call.scheduledAt, localeCode(locale))}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {fmtDuration(call.callLog?.durationSeconds)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={translateUi("Actions for outbound call {id}", {id: call.outboundId})}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel><Trans>{"Call actions"}</Trans></DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedCall(call)}>
                          <PhoneCall className="size-4" />
                          <Trans>{"View details"}</Trans>
                        </DropdownMenuItem>
                        {canRetry(call) ? (
                          <DropdownMenuItem
                            onClick={() => retryCall.mutate(call.outboundId)}
                            disabled={retryCall.isPending}
                          >
                            <RotateCcw className="size-4" />
                            <Trans>{"Retry call"}</Trans>
                          </DropdownMenuItem>
                        ) : null}
                        {canCancel(call) ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setCancelTarget(call)}
                            >
                              <SquareX className="size-4" />
                              <Trans>{"Cancel call"}</Trans>
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OutboundCallDetailDialog
        call={selectedCall}
        onOpenChange={(open) => {
          if (!open) setSelectedCall(null);
        }}
      />

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !cancelCall.isPending) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><Trans>{"Cancel outbound call?"}</Trans></AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>{"This cancels the scheduled call to"}</Trans> {cancelTarget?.phoneNumber}<Trans>{". Calls already in progress cannot be cancelled here."}</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelCall.isPending}>
              <Trans>{"Keep call"}</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                confirmCancel();
              }}
              disabled={cancelCall.isPending}
            >
              {cancelCall.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              <Trans>{"Cancel call"}</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
