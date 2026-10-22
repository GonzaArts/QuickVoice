import type { ComponentProps } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Trans } from "@/src/i18n/Trans";

import { Button } from "@/src/components/ui/button";

type RetryButtonProps = ComponentProps<typeof Button> & {
  isRetrying?: boolean;
};

export function RetryButton({
  children = <Trans>{"Retry"}</Trans>,
  disabled = false,
  isRetrying = false,
  type = "button",
  variant = "outline",
  ...props
}: RetryButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      disabled={disabled || isRetrying}
      aria-disabled={disabled || isRetrying}
      {...props}
    >
      {isRetrying ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw aria-hidden="true" />
      )}
      {isRetrying ? <Trans>{"Retrying"}</Trans> : children}
    </Button>
  );
}
