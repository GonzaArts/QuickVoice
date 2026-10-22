"use client";

import { useT } from "@/src/i18n/provider";
import { Trans } from "@/src/i18n/Trans";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/common/EmptyState";
import { useAgents } from "@/src/hooks/queries/agents";
import { dashboardCallsHref } from "@/src/components/dashboard/call-filter-links";
import type {
  AgentBucket,
  DashboardRange,
  DashboardSummary,
} from "@/src/lib/api/resources/dashboard";
import type { Agent } from "@/src/lib/api/types";

function resolveAgentName({
  agent,
  agents,
  agentsLoading,
  agentsError,
}: {
  agent: AgentBucket;
  agents?: Agent[];
  agentsLoading: boolean;
  agentsError: boolean;
}) {
  if (!agent.agentId) return "Unassigned";
  if (agentsLoading) return "Resolving agent";
  if (agentsError) return "Agent name unavailable";
  return (
    agents?.find((knownAgent) => knownAgent.agentId === agent.agentId)?.name ??
    "Unknown agent"
  );
}

export function AgentActivityList({
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
  const {
    data: agents,
    isLoading: agentsLoading,
    isError: agentsError,
  } = useAgents();

  const top = summary?.topAgents ?? [];
  const max = top[0]?.calls ?? 1;
  const totalCalls = top.reduce((sum, agent) => sum + agent.calls, 0);
  const hasAgentLookupGap = agentsError && top.some((agent) => agent.agentId);

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            <Trans>{"Agent activity"}</Trans>
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground"><Trans>{"Top agents"}</Trans></h3>
          <p className="text-xs text-muted-foreground">
            <Trans>{"Ranked by call volume in this period."}</Trans>
          </p>
        </div>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:underline"
        >
          <Trans>{"Manage"}</Trans> <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 border-b bg-muted/20 text-xs">
        <div className="border-r px-5 py-3">
          <p className="font-semibold text-foreground">{top.length}</p>
          <p className="text-muted-foreground"><Trans>{"active agents"}</Trans></p>
        </div>
        <div className="px-5 py-3">
          <p className="font-semibold text-foreground">{totalCalls}</p>
          <p className="text-muted-foreground"><Trans>{"assigned calls"}</Trans></p>
        </div>
      </div>
      {hasAgentLookupGap ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 border-b bg-muted/40 px-5 py-3 text-xs text-muted-foreground"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold"><Trans>{"Partial agent data:"}</Trans></span> <Trans>{"call counts loaded, but agent names could not be resolved. Use the call links to inspect the source records."}</Trans>
          </span>
        </div>
      ) : null}
      {loading ? (
        <div className="space-y-4 p-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !top.length ? (
        <EmptyState
          icon={Bot}
          title="No agent activity"
          description="Create an agent and connect it to a number to see activity."
          className="border-0"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="sm">
                <Link href="/agents"><Trans>{"Create agent"}</Trans></Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/numbers"><Trans>{"Connect number"}</Trans></Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4 p-5">
          {top.map((agent, index) => {
            const pct = Math.max(4, Math.round((agent.calls / max) * 100));
            const successPct = Math.round(agent.successRate * 100);
            const agentName = resolveAgentName({
              agent,
              agents,
              agentsLoading,
              agentsError,
            });
            return (
              <Link
                key={agent.agentId ?? "unknown"}
                href={dashboardCallsHref({ range, agentId: agent.agentId, from: customFrom, to: customTo })}
                className="group block rounded-lg border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/25 hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={translateUi("View calls for {name} in the selected dashboard range", {name: agentName})}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-xs font-semibold text-blue-400">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {translateUi(agentName)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <PhoneCall className="size-3" />
                            {agent.calls} <Trans>{"calls"}</Trans>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            {successPct}<Trans>{"% success"}</Trans>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">{agent.minutes}m</p>
                        <p><Trans>{"talk time"}</Trans></p>
                        <p className="mt-1 inline-flex items-center gap-1 font-medium text-blue-400">
                          <Trans>{"View calls"}</Trans>
                          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </p>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
