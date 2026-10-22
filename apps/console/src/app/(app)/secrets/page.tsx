"use client";

import { Trans } from "@/src/i18n/Trans";
import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";

import { PageHeader } from "@/src/components/common/PageHeader";
import { Button } from "@/src/components/ui/button";
import { AddSecretDialog } from "@/src/components/secrets/AddSecretDialog";
import { SecretsTable } from "@/src/components/secrets/SecretsTable";

export default function SecretsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const addButton = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      <Trans>{"Add secret"}</Trans>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Secrets"
        description="Store credentials for tools and webhooks without revealing values in the console."
        actions={addButton}
      />

      <div className="grid gap-4 border bg-card p-5 sm:grid-cols-[auto_1fr]">
        <div className="flex size-11 items-center justify-center border bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Encrypted workspace values</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Secret values are encrypted on save and are never returned by the
            API. Use the generated reference when configuring authenticated
            tools or webhook fields.
          </p>
        </div>
      </div>

      <SecretsTable onCreate={() => setCreateOpen(true)} />
      <AddSecretDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
