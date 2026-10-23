"use client";

import { useT } from "@/src/i18n/provider";
import { Trans } from "@/src/i18n/Trans";

export function ExtractedDataPanel({
 metadata,
 data,
 evaluation,
}: {
 metadata: unknown;
 data: unknown;
 evaluation: unknown;
}) {
 const t = useT();
 const meta =
  metadata && typeof metadata === "object" && !Array.isArray(metadata)
   ? (metadata as Record<string, unknown>)
   : {};
 const metadataEntries = Object.entries(meta).filter(([, value]) => !isEmpty(value));
 const hasData = Array.isArray(data) && data.length > 0;
 const hasEval = Array.isArray(evaluation) && evaluation.length > 0;
 const hasMetadata = metadataEntries.length > 0;

 return (
 <div className="space-y-4">
 <div className="border bg-card p-5">
 <h3 className="mb-3 text-sm font-semibold"><Trans>{"Metadata"}</Trans></h3>
 {hasMetadata ? (
 <div className="space-y-3">
 {metadataEntries.map(([key, value]) => (
 <div key={key} className="space-y-1">
 <p className="text-xs text-muted-foreground">{formatLabel(key)}</p>
 <p className="break-words text-sm">{displayValue(value, t)}</p>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-xs text-muted-foreground">
 <Trans>{"No metadata captured for this call."}</Trans>
 </p>
 )}
 </div>
 <div className="border bg-card p-5">
 <h3 className="mb-3 text-sm font-semibold"><Trans>{"Extracted data"}</Trans></h3>
 {hasData ? (
 <pre className="max-h-64 overflow-auto bg-muted/50 p-3 font-mono text-xs">
 {JSON.stringify(data, null, 2)}
 </pre>
 ) : (
 <p className="text-xs text-muted-foreground">
 <Trans>{"Nothing extracted for this call."}</Trans>
 </p>
 )}
 </div>
 <div className="border bg-card p-5">
 <h3 className="mb-3 text-sm font-semibold"><Trans>{"Evaluation"}</Trans></h3>
 {hasEval ? (
 <pre className="max-h-64 overflow-auto bg-muted/50 p-3 font-mono text-xs">
 {JSON.stringify(evaluation, null, 2)}
 </pre>
 ) : (
 <p className="text-xs text-muted-foreground">
 <Trans>{"No evaluation captured for this call."}</Trans>
 </p>
 )}
 </div>
 </div>
 );
}

function isEmpty(value: unknown) {
 return (
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "")
 );
}

function formatLabel(key: string) {
 return key
  .replace(/[_-]+/g, " ")
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/\b\w/g, (char) => char.toUpperCase());
}

function displayValue(value: unknown, t: (key: string) => string) {
 if (typeof value === "boolean") return t(value ? "Yes" : "No");
 if (typeof value === "object") return JSON.stringify(value);
 return String(value);
}
