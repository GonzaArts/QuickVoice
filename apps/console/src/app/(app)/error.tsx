"use client";

import { Trans } from "@/src/i18n/Trans";
import { Button } from "@/src/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 return (
 <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
 <div className="max-w-md border bg-card p-8 text-center">
 <div className="mx-auto mb-5 flex size-12 items-center justify-center bg-destructive/10 text-destructive">
 <AlertTriangle className="size-6" />
 </div>
 <h2 className="text-lg font-semibold"><Trans>{"Something went wrong"}</Trans></h2>
 <p className="mt-2 text-sm text-muted-foreground">
 {error.message || <Trans>{"An unexpected error occurred."}</Trans>}
 </p>
 {error.digest ? (
 <p className="mt-2 font-mono text-[10px] text-muted-foreground">
 {error.digest}
 </p>
 ) : null}
 <div className="mt-6 flex items-center justify-center gap-2">
 <Button onClick={reset}>
 <RotateCcw /> <Trans>{"Try again"}</Trans>
 </Button>
 </div>
 </div>
 </div>
 );
}
