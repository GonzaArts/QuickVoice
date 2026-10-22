"use client";

import { Trans } from "@/src/i18n/Trans";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
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
import { authClient } from "@/src/lib/auth-client";

export default function DangerZonePage() {
 const router = useRouter();
 const { data: session } = authClient.useSession();
 const orgId = session?.session?.activeOrganizationId ?? null;

 const [leaving, setLeaving] = useState(false);
 const [deleting, setDeleting] = useState(false);
 const [confirmName, setConfirmName] = useState("");

 async function onLeave() {
 if (!orgId) return;
 setLeaving(true);
 try {
 const org = authClient.organization as unknown as {
 leave?: (input: { organizationId: string }) => Promise<{
 error?: { message?: string };
 }>;
 };
 if (!org.leave) throw new Error("Leave is not available");
 const { error } = await org.leave({ organizationId: orgId });
 if (error) throw new Error(error.message);
 toast.success("You left the organization");
 router.push("/orgs");
 } catch (err) {
 toast.error(err instanceof Error ? err.message : "Could not leave");
 } finally {
 setLeaving(false);
 }
 }

 async function onDelete() {
 if (!orgId) return;
 setDeleting(true);
 try {
 const { error } = await authClient.organization.delete({
 organizationId: orgId,
 });
 if (error) throw new Error(error.message);
 toast.success("Organization deleted");
 router.push("/orgs");
 } catch (err) {
 toast.error(err instanceof Error ? err.message : "Could not delete");
 } finally {
 setDeleting(false);
 }
 }

 return (
 <div className="space-y-6">
 <section className="border border-destructive/30 bg-destructive/5 p-6">
 <div className="mb-5 flex items-start gap-3">
 <div className="flex size-10 shrink-0 items-center justify-center bg-destructive/10 text-destructive">
 <AlertTriangle className="size-5" />
 </div>
 <div>
 <h2 className="text-base font-semibold text-destructive">
 <Trans>{"Danger zone"}</Trans>
 </h2>
 <p className="text-sm text-muted-foreground">
 These actions cannot be undone. Proceed carefully.
 </p>
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex flex-col gap-3 border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
 <div className="space-y-1">
 <p className="text-sm font-semibold">Leave this organization</p>
 <p className="text-xs text-muted-foreground">
 You&apos;ll lose access. An owner must transfer ownership first
 if you&apos;re the only one.
 </p>
 </div>
 <AlertDialog>
 <AlertDialogTrigger asChild>
 <Button variant="outline">
 <LogOut /> Leave
 </Button>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Leave this organization?</AlertDialogTitle>
 <AlertDialogDescription>
 You&apos;ll be removed from members and lose access to every
 resource here.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel><Trans>{"Cancel"}</Trans></AlertDialogCancel>
 <AlertDialogAction onClick={onLeave} disabled={leaving}>
 {leaving ? (
 <>
 <Loader2 className="animate-spin" /> Leaving…
 </>
 ) : (
 "Leave"
 )}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>

 <div className="flex flex-col gap-3 border border-destructive/40 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
 <div className="space-y-1">
 <p className="text-sm font-semibold">Delete this organization</p>
 <p className="text-xs text-muted-foreground">
 Permanently deletes all agents, numbers, calls, and documents.
 </p>
 </div>
 <AlertDialog
 onOpenChange={(open) => !open && setConfirmName("")}
 >
 <AlertDialogTrigger asChild>
 <Button variant="destructive">
 <Trash2 /> Delete organization
 </Button>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>
 Delete this organization?
 </AlertDialogTitle>
 <AlertDialogDescription>
 <Trans>{"Type"}</Trans> <span className="font-mono font-semibold">DELETE</span>{" "}
 to confirm. This cannot be undone.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <div className="space-y-1.5">
 <Label htmlFor="delete-confirm"><Trans>{"Confirm"}</Trans></Label>
 <Input
 id="delete-confirm"
 value={confirmName}
 onChange={(e) => setConfirmName(e.target.value)}
 placeholder="DELETE"
 />
 </div>
 <AlertDialogFooter>
 <AlertDialogCancel><Trans>{"Cancel"}</Trans></AlertDialogCancel>
 <AlertDialogAction
 onClick={onDelete}
 disabled={confirmName !== "DELETE" || deleting}
 className="bg-destructive text-white hover:bg-destructive/90"
 >
 {deleting ? (
 <>
 <Loader2 className="animate-spin" /> <Trans>{"Deleting…"}</Trans>
 </>
 ) : (
 "Delete organization"
 )}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </div>
 </div>
 </section>
 </div>
 );
}
