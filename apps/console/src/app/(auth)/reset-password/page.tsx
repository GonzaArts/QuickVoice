"use client";

import { Trans } from "@/src/i18n/Trans";
import { localizeError } from "@/src/i18n/errors";
import { useT } from "@/src/i18n/provider";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { authClient } from "@/src/lib/auth-client";
import { invitationPath } from "@/src/lib/links";
import { resetSchema } from "@/src/models/auth/resetSchema";

function ResetPasswordForm() {
 const t = useT();
 const router = useRouter();
 const searchParams = useSearchParams();
 const token = searchParams.get("token") ?? "";
 const invitationId = searchParams.get("invitationId") ?? "";
 const invalidToken = searchParams.get("error") === "INVALID_TOKEN";
 const [loading, setLoading] = useState(false);
 const form = useForm<z.infer<typeof resetSchema>>({
 resolver: zodResolver(resetSchema),
 defaultValues: { token, newPassword: "" },
 });

 useEffect(() => {
 form.setValue("token", token);
 }, [form, token]);

 async function onSubmit(values: z.infer<typeof resetSchema>) {
 setLoading(true);
 try {
 const { error } = await authClient.resetPassword({
 token: values.token,
 newPassword: values.newPassword,
 });
 if (error) throw new Error(error.message || t("Could not reset password"));
 toast.success(t("Password updated"));
 router.push(invitationPath(invitationId, "/login"));
 } catch (err) {
 toast.error(localizeError(t, err, "Could not reset password"));
 } finally {
 setLoading(false);
 }
 }

 return (
 <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
 <div className="w-full max-w-md border bg-card p-6">
 <Button asChild variant="ghost" className="mb-6 px-0">
 <Link href={invitationPath(invitationId, "/login")}>
 <ArrowLeft className="size-4" /> <Trans>{"Back to login"}</Trans>
 </Link>
 </Button>
 <div className="mb-6 space-y-2">
 <div className="flex size-12 items-center justify-center bg-primary/10 text-primary">
 <KeyRound className="size-6" />
 </div>
 <h1 className="text-2xl font-semibold tracking-tight"><Trans>{"Reset password"}</Trans></h1>
 <p className="text-sm text-muted-foreground">
 <Trans>{"Choose a new password for your QuickVoice account."}</Trans>
 </p>
 </div>
 {invalidToken || !token ? (
 <div className="flex gap-3 border bg-muted/20 p-4 text-sm text-muted-foreground">
 <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
 <div>
 <p className="font-medium text-foreground"><Trans>{"Reset link is invalid or expired."}</Trans></p>
 <p className="mt-1">
 <Trans>{"Request a new password reset email to continue."}</Trans>
 </p>
 <Button asChild variant="outline" size="sm" className="mt-4">
 <Link href={invitationPath(invitationId, "/forgot-password")}><Trans>{"Request a new link"}</Trans></Link>
 </Button>
 </div>
 </div>
 ) : (
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
 <FormField
 control={form.control}
 name="newPassword"
 render={({ field }) => (
 <FormItem>
 <FormLabel><Trans>{"New password"}</Trans></FormLabel>
 <FormControl>
 <Input
 {...field}
 type="password"
 autoComplete="new-password"
 disabled={loading}
 placeholder={t("At least 8 characters")}
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <Button type="submit" className="w-full" disabled={loading}>
 {loading ? (
 <>
 <Loader2 className="animate-spin" /> <Trans>{"Saving..."}</Trans>
 </>
 ) : (
 <Trans>{"Reset password"}</Trans>
 )}
 </Button>
 </form>
 </Form>
 )}
 </div>
 </div>
 );
}

export default function ResetPasswordPage() {
 return (
 <Suspense
 fallback={
 <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
 <div className="w-full max-w-md border bg-card p-6">
 <div className="h-6 w-32 animate-pulse bg-muted" />
 <div className="mt-6 h-32 animate-pulse bg-muted" />
 </div>
 </div>
 }
 >
 <ResetPasswordForm />
 </Suspense>
 );
}
