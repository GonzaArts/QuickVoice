"use client";

import { useT } from "@/src/i18n/provider";
import { localizeValidationMessage } from "@/src/i18n/errors";

import { Trans } from "@/src/i18n/Trans";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useCreateSecret } from "@/src/hooks/queries/secrets";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Secret name is required")
    .max(120, "Secret name must be 120 characters or less")
    .regex(
      /^[A-Za-z0-9_.:-]+$/,
      "Use letters, numbers, dots, underscores, colons, or hyphens"
    ),
  value: z.string().min(1, "Secret value is required"),
});

type FormValues = z.infer<typeof schema>;

export function AddSecretDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const translateUi = useT();
  const createSecret = useCreateSecret();
  const [showValue, setShowValue] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", value: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createSecret.mutateAsync(values, {
        onSuccess: () => {
          toast.success(translateUi("Secret saved"));
          reset();
          setShowValue(false);
          onOpenChange(false);
        },
      });
    } catch {
      // The mutation hook shows the user-facing error toast.
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !createSecret.isPending) {
      reset();
      setShowValue(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Trans>{"New secret"}</Trans></DialogTitle>
          <DialogDescription>
            <Trans>{"Store an integration token or API key without exposing the value in the console."}</Trans>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="secret-name"><Trans>{"Name"}</Trans></Label>
            <Input
              id="secret-name"
              placeholder={translateUi("stripe.api_key")}
              autoComplete="off"
              disabled={createSecret.isPending}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{localizeValidationMessage(translateUi, errors.name.message ?? "")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                <Trans>{"Names must be unique in this workspace."}</Trans>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-value"><Trans>{"Value"}</Trans></Label>
            <div className="flex gap-2">
              <Input
                id="secret-value"
                type={showValue ? "text" : "password"}
                autoComplete="new-password"
                disabled={createSecret.isPending}
                {...register("value")}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={translateUi(showValue ? "Hide secret value" : "Show secret value")}
                onClick={() => setShowValue((visible) => !visible)}
                disabled={createSecret.isPending}
              >
                {showValue ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            {errors.value ? (
              <p className="text-xs text-destructive">{localizeValidationMessage(translateUi, errors.value.message ?? "")}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createSecret.isPending}
            >
              <Trans>{"Cancel"}</Trans>
            </Button>
            <Button type="submit" disabled={createSecret.isPending}>
              {createSecret.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              <Trans>{"Save secret"}</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
