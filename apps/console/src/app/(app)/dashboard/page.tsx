"use client";

import { useT } from "@/src/i18n/provider";

import { Trans } from "@/src/i18n/Trans";
import { useLocale } from "@/src/i18n/provider";
import { localeCode } from "@/src/i18n/config";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  ErrorState,
  OfflineState,
  PermissionState,
} from "@/src/components/common/EmptyState";
import { RetryButton } from "@/src/components/common/RetryButton";
import { RangeSwitcher } from "@/src/components/dashboard/RangeSwitcher";
import { KpiCards } from "@/src/components/dashboard/KpiCards";
import { VolumeChart } from "@/src/components/dashboard/VolumeChart";
import { BreakdownCharts } from "@/src/components/dashboard/BreakdownCharts";
import { RecentCallsTable } from "@/src/components/dashboard/RecentCallsTable";
import { AgentActivityList } from "@/src/components/dashboard/AgentActivityList";
import { useDashboardSummary } from "@/src/hooks/queries/dashboard";
import type {
  DashboardRange,
  DashboardSummary,
} from "@/src/lib/api/resources/dashboard";
import {
  apiErrorStatus,
  getApiErrorStateCopy,
} from "@/src/lib/api-error-state";

function resolveRange(param: string | null): DashboardRange {
  if (
    param === "24h" ||
    param === "7d" ||
    param === "30d" ||
    param === "custom"
  ) {
    return param;
  }
  return "7d";
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultCustomRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function resolveDateParam(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

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

  return isOnline;
}

function collectionSize(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function isPermissionError(error: unknown) {
  const status = apiErrorStatus(error);
  return status === 401 || status === 403;
}

function getMissingDashboardSections(summary?: DashboardSummary) {
  if (!summary || (summary.totals?.calls ?? 0) === 0) return [];

  const missingSections: string[] = [];
  if (collectionSize(summary.series) === 0) {
    missingSections.push("traffic timeline");
  }
  if (collectionSize(summary.statusBreakdown) === 0) {
    missingSections.push("outcome breakdown");
  }
  if (collectionSize(summary.directionBreakdown) === 0) {
    missingSections.push("routing mix");
  }
  if (collectionSize(summary.topAgents) === 0) {
    missingSections.push("agent activity");
  }
  if (collectionSize(summary.recent) === 0) {
    missingSections.push("recent calls");
  }
  return missingSections;
}

function DashboardPartialDataNotice({ sections }: { sections: string[] }) {
  const { locale, t } = useLocale();
  if (!sections.length) return null;
  const sectionNames = new Intl.ListFormat(localeCode(locale), {
    style: "long",
    type: "conjunction",
  }).format(sections.map((section) => t(section)));

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 border bg-muted/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold"><Trans>{"Partial dashboard data"}</Trans></p>
          <p className="mt-1">
            {t("The summary loaded, but some sections are not available yet: {sections}. Refresh or review call logs while the remaining data catches up.", {
              sections: sectionNames,
            })}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0 bg-card">
        <Link href="/calls"><Trans>{"Review call logs"}</Trans></Link>
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const translateUi = useT();
  const params = useSearchParams();
  const range = resolveRange(params.get("range"));
  const defaultCustom = defaultCustomRange();
  const customFrom =
    range === "custom"
      ? resolveDateParam(params.get("from")) ?? defaultCustom.from
      : undefined;
  const customTo =
    range === "custom"
      ? resolveDateParam(params.get("to")) ?? defaultCustom.to
      : undefined;
  const isOnline = useOnlineStatus();
  const {
    data,
    error,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useDashboardSummary({ range, from: customFrom, to: customTo });
  const showBlockingError = isError && !data;
  const dashboardHasPermissionError =
    showBlockingError && isPermissionError(error);
  const dashboardErrorState = showBlockingError
    ? getApiErrorStateCopy(error, {
        resourceName: "dashboard",
        isOnline,
        t: translateUi,
        overrides: {
          forbidden: {
            title: "Dashboard access required",
            description:
              "You need dashboard and call reporting permission to view this operations summary. Ask a workspace owner to update your role.",
          },
        },
      })
    : null;
  const missingDashboardSections = getMissingDashboardSections(data);
  const dashboardRetryAction = (
    <RetryButton
      onClick={() => refetch()}
      isRetrying={isFetching}
      disabled={dashboardErrorState?.kind === "offline" && !isOnline}
    >
      <Trans>{"Retry"}</Trans>
    </RetryButton>
  );
  const dashboardErrorAction =
    dashboardErrorState?.reason === "forbidden" ? (
      <Button asChild variant="outline">
        <Link href="/settings/roles"><Trans>{"Review role settings"}</Trans></Link>
      </Button>
    ) : dashboardErrorState?.reason === "unauthorized" ? (
      <Button asChild variant="outline">
        <Link href="/login"><Trans>{"Sign in"}</Trans></Link>
      </Button>
    ) : (
      dashboardRetryAction
    );

  return (
    <div className="flex flex-col gap-5 rounded-lg border bg-muted/25 p-4 shadow-[inset_0_1px_0_hsl(var(--background))] sm:p-5">
      <div className="flex justify-end">
        <RangeSwitcher
          key={`${range}-${customFrom ?? ""}-${customTo ?? ""}`}
          current={range}
          customFrom={customFrom}
          customTo={customTo}
          loading={isFetching}
        />
      </div>
      {dashboardErrorState?.kind === "offline" ? (
        <OfflineState
          title={dashboardErrorState.title}
          description={dashboardErrorState.description}
          action={dashboardErrorAction}
        />
      ) : dashboardErrorState?.kind === "permission" ||
        dashboardHasPermissionError ? (
        <PermissionState
          title={dashboardErrorState?.title}
          description={dashboardErrorState?.description}
          action={dashboardErrorAction}
        />
      ) : dashboardErrorState ? (
        <ErrorState
          title={dashboardErrorState.title}
          description={dashboardErrorState.description}
          action={dashboardErrorAction}
        />
      ) : (
        <>
          <DashboardPartialDataNotice sections={missingDashboardSections} />
          <KpiCards
            summary={data}
            range={range}
            loading={isLoading}
            customFrom={customFrom}
            customTo={customTo}
          />
          <section
            className="grid grid-cols-1 gap-4 rounded-lg border bg-background/60 p-3 shadow-sm xl:grid-cols-3"
            aria-label={translateUi("Traffic and agent performance")}
          >
            <div className="xl:col-span-2">
              <VolumeChart summary={data} range={range} loading={isLoading} />
            </div>
            <AgentActivityList
              summary={data}
              range={range}
              loading={isLoading}
              customFrom={customFrom}
              customTo={customTo}
            />
          </section>
          <BreakdownCharts
            summary={data}
            range={range}
            loading={isLoading}
            customFrom={customFrom}
            customTo={customTo}
          />
          <RecentCallsTable summary={data} loading={isLoading} />
        </>
      )}
    </div>
  );
}
