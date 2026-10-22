import { Trans } from "@/src/i18n/Trans";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {typeof title === "string" ? <Trans>{title}</Trans> : title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{typeof description === "string" ? <Trans>{description}</Trans> : description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
