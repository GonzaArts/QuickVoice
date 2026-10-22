import type { LucideIcon } from "lucide-react";
import { Trans } from "@/src/i18n/Trans";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "@/src/components/ui/skeleton";

type StatTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<StatTone, string> = {
  neutral: "border-border bg-muted/35 text-muted-foreground",
  success: "border-border bg-muted/35 text-muted-foreground",
  warning: "border-border bg-muted/35 text-muted-foreground",
  danger: "border-border bg-muted/35 text-muted-foreground",
  info: "border-border bg-muted/35 text-muted-foreground",
};

const cardToneStyles: Record<StatTone, string> = {
  neutral: "border-border",
  success: "border-border",
  warning: "border-amber-500/30",
  danger: "border-red-400/25",
  info: "border-border",
};

export function StatCard({
  label,
  value,
  helper,
  eyebrow,
  icon: Icon,
  loading,
  className,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
  tone?: StatTone;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-lg border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        cardToneStyles[tone],
        className
      )}
    >
      <div className="flex h-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-[2.5rem] space-y-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              <Trans>{label}</Trans>
            </p>
            {eyebrow ? (
              <p className="text-xs text-muted-foreground">{typeof eyebrow === "string" ? <Trans>{eyebrow}</Trans> : eyebrow}</p>
            ) : null}
          </div>
          {loading ? (
            <Skeleton className="mt-4 h-8 w-24" />
          ) : (
            <p className="mt-4 text-3xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {value}
            </p>
          )}
          <div className="mt-auto min-h-[2.75rem] pt-4 text-xs font-medium leading-snug text-muted-foreground">
            {helper}
          </div>
        </div>
        {Icon ? (
          <div className={cn("shrink-0 rounded-md p-2.5", toneStyles[tone])}>
            <Icon className="size-4" />
          </div>
        ) : null}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/80"
      />
    </div>
  );
}
