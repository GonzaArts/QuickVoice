
import { Trans } from "@/src/i18n/Trans";
import { useId } from "react";
import { Badge } from "@/src/components/ui/badge";
import type { McpToolDescriptor } from "@/src/lib/api/types";

export function McpToolBadges({ tools }: { tools: McpToolDescriptor[] | null }) {
  const permissionsLabelId = useId();
  if (!tools?.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <span id={permissionsLabelId} className="sr-only"><Trans>{"MCP tool permissions"}</Trans></span>
      <ul aria-labelledby={permissionsLabelId} className="flex flex-wrap gap-1.5">
        {tools.slice(0, 8).map((tool) => (
          <li key={tool.name} className="min-w-0 max-w-full">
            <Badge variant="secondary" className="h-auto max-w-full whitespace-normal text-xs">
              <span className="min-w-0 break-all">{tool.name}</span>
              <span>· {tool.requiresConfirmation === false ? <Trans>{"Read-only"}</Trans> : <Trans>{"Confirmation required"}</Trans>}</span>
            </Badge>
          </li>
        ))}
        {tools.length > 8 && (
          <li><Badge variant="outline" className="text-xs">+{tools.length - 8} <Trans>{"more tools"}</Trans></Badge></li>
        )}
      </ul>
      {tools.some((tool) => tool.requiresConfirmation !== false) && (
        <p className="text-xs text-muted-foreground">
          <Trans>{"Tools requiring confirmation are blocked during agent calls. Tools without read-only metadata also require confirmation; refresh the connection to fetch current metadata."}</Trans>
        </p>
      )}
    </div>
  );
}
