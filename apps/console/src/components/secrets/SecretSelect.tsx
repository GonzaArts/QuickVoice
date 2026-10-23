"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { useSecrets } from "@/src/hooks/queries/secrets";
import { useT } from "@/src/i18n/provider";

export function SecretSelect({
  value,
  onValueChange,
  disabled,
  placeholder = "Select secret",
  ariaLabel = "Select secret",
}: {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const t = useT();
  const { data: secrets = [], isLoading } = useSecrets();

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading || secrets.length === 0}
    >
      <SelectTrigger className="h-9" aria-label={t(ariaLabel)}>
        <SelectValue
          placeholder={
            isLoading
              ? t("Loading secrets...")
              : secrets.length === 0
                ? t("No secrets saved")
                : t(placeholder)
          }
        />
      </SelectTrigger>
      <SelectContent>
        {secrets.map((secret) => (
          <SelectItem key={secret.secretId} value={secret.reference}>
            {secret.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
