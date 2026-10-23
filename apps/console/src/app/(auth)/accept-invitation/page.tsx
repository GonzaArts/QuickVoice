"use client";

import { Trans } from "@/src/i18n/Trans";
import { localizeError } from "@/src/i18n/errors";
import { useT } from "@/src/i18n/provider";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import Logo1 from "@/src/components/logo1";
import { authClient } from "@/src/lib/auth-client";
import { CONSOLE_URL, invitationPath } from "@/src/lib/links";
import { clearIdentityCache } from "@/src/lib/query-cache";

function Invitation() {
  const t = useT();
  const invitationId = useSearchParams().get("invitationId") ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [joinedOrganizationId, setJoinedOrganizationId] = useState("");
  const invitation = useQuery({
    queryKey: ["invitation", invitationId, session?.user.id, session?.user.emailVerified],
    enabled: !!invitationId && !!session && !joinedOrganizationId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      if (error) throw new Error(error.message, { cause: error.code });
      return data;
    },
  });

  async function openWorkspace(organizationId: string) {
    const { error } = await authClient.organization.setActive({ organizationId });
    if (error) throw new Error("You joined the workspace, but we could not open it. Please try again.");
    clearIdentityCache(queryClient);
    router.replace("/dashboard");
  }

  async function act(action: "accept" | "decline" | "signout" | "verify" | "open") {
    setBusy(true);
    setActionError("");
    try {
      if (action === "signout") {
        const { error } = await authClient.signOut();
        if (error) throw new Error(error.message);
        clearIdentityCache(queryClient);
        router.replace(invitationPath(invitationId, "/login"));
      } else if (action === "verify" && session) {
        const { error } = await authClient.sendVerificationEmail({
          email: session.user.email,
          callbackURL: `${CONSOLE_URL ?? window.location.origin}${invitationPath(invitationId)}`,
        });
        if (error) throw new Error(error.message);
        setVerificationSent(true);
      } else if (action === "open") {
        await openWorkspace(joinedOrganizationId);
      } else if (action === "accept") {
        const { data, error } = await authClient.organization.acceptInvitation({ invitationId });
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Could not accept this invitation. Please try again.");
        setJoinedOrganizationId(data.invitation.organizationId);
        await openWorkspace(data.invitation.organizationId);
      } else if (action === "decline") {
        const { error } = await authClient.organization.rejectInvitation({ invitationId });
        if (error) throw new Error(error.message);
        router.replace("/orgs");
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const wrongAccount = invitation.error?.cause === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION";
  const needsVerification = invitation.error?.cause === "EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION";
  const unavailable = invitation.error?.cause === "INVITATION_NOT_FOUND" || invitation.error?.message === "Invitation not found!";

  return (
    <>
      <div className="mb-6 flex size-12 items-center justify-center bg-primary/10 text-primary">
        <Mail className="size-6" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight"><Trans>{"Workspace invitation"}</Trans></h1>
      <div className="mt-3 space-y-5 text-sm" aria-busy={busy}>
        {!invitationId ? (
          <p role="alert"><Trans>{"This invitation link is incomplete. Ask the workspace owner to resend it."}</Trans></p>
        ) : isPending ? (
          <p role="status" className="text-muted-foreground"><Trans>{"Checking your account…"}</Trans></p>
        ) : sessionError ? (
          <>
            <p role="alert"><Trans>{"Unable to check your account. Please try again."}</Trans></p>
            <Button className="min-h-11 w-full" onClick={() => refetch()}><Trans>{"Try again"}</Trans></Button>
          </>
        ) : !session ? (
          <>
            <p className="text-muted-foreground"><Trans>{"Sign in or create an account with the email address that received this invitation to review and join the workspace."}</Trans></p>
            <div className="grid gap-3">
              <Button asChild className="min-h-11"><Link href={invitationPath(invitationId, "/login")}><Trans>{"Sign in to continue"}</Trans></Link></Button>
              <Button asChild variant="outline" className="min-h-11"><Link href={invitationPath(invitationId, "/register")}><Trans>{"Create an account"}</Trans></Link></Button>
            </div>
          </>
        ) : joinedOrganizationId ? (
          <>
            <p role="status"><Trans>{"You have joined the workspace."}</Trans></p>
            <Button className="min-h-11 w-full" disabled={busy} onClick={() => act("open")}><Trans>{"Open workspace"}</Trans></Button>
          </>
        ) : invitation.isPending ? (
          <p role="status" className="text-muted-foreground"><Trans>{"Loading invitation…"}</Trans></p>
        ) : invitation.error ? (
          <>
            <p role="alert" className="text-muted-foreground">
              {wrongAccount ? <Trans>{"This invitation was sent to a different email address. Sign in with the account that received it."}</Trans>
                : needsVerification ? <Trans>{"Verify your email address before joining this workspace."}</Trans>
                : unavailable ? <Trans>{"This invitation is unavailable. It may have expired, been canceled, or already been used. Ask the workspace owner for a new invitation."}</Trans>
                : <Trans>{"We could not load this invitation. Please try again."}</Trans>}
            </p>
            <p className="break-words"><Trans>{"Signed in as"}</Trans> <span className="font-medium">{session.user.email}</span></p>
            {needsVerification && (
              <>
                <Button className="min-h-11 w-full" disabled={busy || verificationSent} onClick={() => act("verify")}>
                  {verificationSent ? <Trans>{"Verification email sent"}</Trans> : <Trans>{"Send verification email"}</Trans>}
                </Button>
                {verificationSent && <p role="status" className="text-muted-foreground"><Trans>{"Check your inbox and open the verification link to return here."}</Trans></p>}
              </>
            )}
            {wrongAccount || needsVerification ? (
              <Button variant="outline" className="min-h-11 w-full" disabled={busy} onClick={() => act("signout")}><Trans>{"Use a different account"}</Trans></Button>
            ) : unavailable ? (
              <Button asChild variant="outline" className="min-h-11 w-full"><Link href="/orgs"><Trans>{"Go to workspaces"}</Trans></Link></Button>
            ) : (
              <Button className="min-h-11 w-full" disabled={invitation.isFetching} onClick={() => invitation.refetch()}><Trans>{"Try again"}</Trans></Button>
            )}
          </>
        ) : invitation.data ? (
          <>
            <p className="break-words text-muted-foreground"><span className="font-medium text-foreground">{invitation.data.inviterEmail}</span> <Trans>{"invited you to join their team."}</Trans></p>
            <dl className="space-y-4 border bg-muted/20 p-4">
              <div><dt className="text-muted-foreground"><Trans>{"Workspace"}</Trans></dt><dd className="mt-1 break-words text-base font-semibold">{invitation.data.organizationName}</dd></div>
              <div><dt className="text-muted-foreground"><Trans>{"Your role"}</Trans></dt><dd className="mt-1 break-words">{Object.prototype.hasOwnProperty.call({ member: true, admin: true, owner: true }, invitation.data.role) ? t(({ member: "Member", admin: "Admin", owner: "Owner" } as Record<string, string>)[invitation.data.role]) : invitation.data.role}</dd></div>
              <div><dt className="text-muted-foreground"><Trans>{"Joining as"}</Trans></dt><dd className="mt-1 break-words">{session.user.email}</dd></div>
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="min-h-11" disabled={busy} onClick={() => act("accept")}>
                {busy && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}<Trans>{"Accept invitation"}</Trans>
              </Button>
              <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => act("decline")}><Trans>{"Decline"}</Trans></Button>
            </div>
            <Button variant="link" className="min-h-11 w-full" disabled={busy} onClick={() => act("signout")}><Trans>{"Use a different account"}</Trans></Button>
          </>
        ) : null}
        {actionError && <p role="alert" className="text-destructive">{localizeError(t, actionError, "Could not accept this invitation. Please try again.")}</p>}
      </div>
    </>
  );
}

export default function AcceptInvitationPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Logo1 />
      <section className="w-full max-w-md border bg-card p-6 sm:p-8">
        <Suspense fallback={<p role="status" className="text-sm text-muted-foreground"><Trans>{"Loading invitation…"}</Trans></p>}>
          <Invitation />
        </Suspense>
      </section>
    </main>
  );
}
