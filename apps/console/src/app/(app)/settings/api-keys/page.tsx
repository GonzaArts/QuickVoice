"use client";

import { useT } from "@/src/i18n/provider";

import { Trans } from "@/src/i18n/Trans";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/common/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { authClient } from "@/src/lib/auth-client";
import { queryKeys } from "@/src/lib/query-keys";

type ApiKey = {
  id: string;
  name?: string | null;
  start?: string | null;
  createdAt?: string | Date;
  lastRequest?: string | Date | null;
  enabled?: boolean | null;
  expiresAt?: string | Date | null;
};

type ApiKeyListResponse = {
  apiKeys?: ApiKey[];
  total?: number;
};

const schema = z.object({
  name: z.string().min(2, "Name is required"),
});

export default function ApiKeysPage() {
  const translateUi = useT();
  const { data: session } = authClient.useSession();
  const orgId = session?.session?.activeOrganizationId ?? null;

  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const { data: keys = [], isFetching: loading, refetch, error: loadError } = useQuery({
    queryKey: queryKeys.apiKeys.list(orgId),
    enabled: !!orgId,
    queryFn: async () => {
      const api = authClient.apiKey as {
        list?: (input: {
          query?: { organizationId?: string };
        }) => Promise<{ data?: ApiKeyListResponse; error?: { message?: string } }>;
      };
      if (!orgId) return [];
      if (!api.list) throw new Error("API key listing is not available");
      const res = await api.list({ query: { organizationId: orgId } });
      if (res.error) throw new Error(res.error.message || "Could not load API keys");
      return res.data?.apiKeys ?? [];
    },
  });

  async function refresh() {
    await refetch();
  }

  async function onCreate(values: z.infer<typeof schema>) {
    if (!orgId) return;
    setCreating(true);
    try {
      const api = authClient.apiKey as {
        create?: (input: { name: string; organizationId: string }) => Promise<{
          data?: { key: string };
          error?: { message?: string };
        }>;
      };
      if (!api.create) throw new Error("API key creation is not available");
      const { data, error } = await api.create({
        name: values.name,
        organizationId: orgId,
      });
      if (error || !data?.key)
        throw new Error(error?.message ?? "Create failed");
      setNewKey({ key: data.key, name: values.name });
      setCreateOpen(false);
      form.reset();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : translateUi("Could not create key"));
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(keyId: string) {
    try {
      const api = authClient.apiKey as {
        delete?: (input: { keyId: string }) => Promise<{
          error?: { message?: string };
        }>;
      };
      if (!api.delete) throw new Error("API key delete is not available");
      const { error } = await api.delete({ keyId });
      if (error) throw new Error(error.message ?? "Revoke failed");
      toast.success(translateUi("Key revoked"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : translateUi("Could not revoke key"));
    }
  }

  async function copyNewKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError.message}</p> : null}
      <section className="border bg-card p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold"><Trans>{"API keys"}</Trans></h2>
            <p className="text-sm text-muted-foreground">
              <Trans>{"Use these organization-scoped keys to authenticate the QuickVoice API and QuickVoice MCP server with the"}</Trans>{" "}
              <code className="bg-muted px-1 py-0.5 font-mono text-xs">
                x-api-key
              </code>{" "}
              <Trans>{"header. Bearer authentication is not supported for these keys. Organization API keys are read-only and cannot manage billing or phone-number ownership."}</Trans>
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> <Trans>{"New API key"}</Trans>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle><Trans>{"Create API key"}</Trans></DialogTitle>
                <DialogDescription>
                  <Trans>{"Give the key a descriptive name. You'll be able to copy it once — make sure to store it somewhere safe. New keys use the active organization, are MCP-ready, and receive read-only access."}</Trans>
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onCreate)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><Trans>{"Name"}</Trans></FormLabel>
                        <FormControl>
                          <Input placeholder={translateUi("Production API")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      disabled={creating}
                    >
                      <Trans>{"Cancel"}</Trans>
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <Loader2 className="animate-spin" /> <Trans>{"Creating…"}</Trans>
                        </>
                      ) : (
                        <Trans>{"Create key"}</Trans>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !keys.length ? (
          <EmptyState
            icon={KeyRound}
            title="No API keys yet"
            description="Create a key to call QuickVoice from your application."
            className="border-0"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Trans>{"Name"}</Trans></TableHead>
                <TableHead><Trans>{"Key"}</Trans></TableHead>
                <TableHead><Trans>{"Status"}</Trans></TableHead>
                <TableHead><Trans>{"Created"}</Trans></TableHead>
                <TableHead className="text-right"><Trans>{"Actions"}</Trans></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {k.start ? `${k.start}••••••••` : "••••••••"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={k.enabled === false ? "secondary" : "default"}
                    >
                      {k.enabled === false ? <Trans>{"Disabled"}</Trans> : <Trans>{"Active"}</Trans>}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.createdAt
                      ? new Date(k.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={translateUi("Revoke")}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle><Trans>{"Revoke this key?"}</Trans></AlertDialogTitle>
                          <AlertDialogDescription>
                            <Trans>{"Any application using this key will stop working immediately."}</Trans>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel><Trans>{"Cancel"}</Trans></AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRevoke(k.id)}>
                            <Trans>{"Revoke"}</Trans>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><Trans>{"Copy your API key"}</Trans></DialogTitle>
            <DialogDescription>
              <Trans>{"This is the only time you'll see the full key. Copy it now and store it in a secure place."}</Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-3 font-mono text-xs break-all">
            {newKey?.key}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyNewKey}>
              {copied ? (
                <>
                  <Check /> <Trans>{"Copied"}</Trans>
                </>
              ) : (
                <>
                  <Copy /> <Trans>{"Copy key"}</Trans>
                </>
              )}
            </Button>
            <Button onClick={() => setNewKey(null)}><Trans>{"I've saved it"}</Trans></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
