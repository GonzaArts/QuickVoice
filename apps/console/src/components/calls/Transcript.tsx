"use client";

import { Trans } from "@/src/i18n/Trans";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { useTranscript } from "@/src/hooks/queries/calls";

export function Transcript({ callId }: { callId: string }) {
  const q = useTranscript(callId);
  const rows = q.data?.pages.flatMap((p) => p.data) ?? [];

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground shadow-sm">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MessageCircle className="size-5" />
        </div>
        <p className="font-medium text-foreground"><Trans>{"No transcript captured"}</Trans></p>
        <p className="mt-1"><Trans>{"This call does not have transcript messages yet."}</Trans></p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const isAgent = r.speaker === "agent" || r.speaker === "assistant";
        return (
          <div
            key={r.callTransId}
            className={cn("group flex", isAgent ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 sm:max-w-[76%]",
                isAgent
                  ? "rounded-tl-md bg-background text-foreground"
                  : "rounded-tr-md border-blue-600/20 bg-blue-600 text-white"
              )}
            >
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
                {isAgent ? <Trans>{"Agent"}</Trans> : <Trans>{"Caller"}</Trans>}
              </p>
              <p className="text-sm leading-6">{r.messageText}</p>
              <p className={cn("mt-2 text-right text-[10px]", isAgent ? "text-muted-foreground" : "text-white/70")}>
                {new Date(r.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}

      {q.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => q.fetchNextPage()}
            disabled={q.isFetchingNextPage}
          >
            {q.isFetchingNextPage ? (
              <>
                <Loader2 className="animate-spin" /> <Trans>{"Loading…"}</Trans>
              </>
            ) : (
              <Trans>{"Load more"}</Trans>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
