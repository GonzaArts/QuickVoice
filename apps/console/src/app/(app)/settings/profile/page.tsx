"use client";

import { Trans } from "@/src/i18n/Trans";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/src/components/shell/LanguageSwitcher";
import { useT } from "@/src/i18n/provider";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
 InputGroup,
 InputGroupButton,
 InputGroupInput,
} from "@/src/components/ui/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
 Form,
 FormControl,
 FormDescription,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/src/components/ui/form";
import { authClient } from "@/src/lib/auth-client";

const profileSchema = z.object({
 name: z.string().min(2, "Name must be at least 2 characters"),
});

const passwordSchema = z
 .object({
 currentPassword: z.string().min(8, "At least 8 characters"),
 newPassword: z.string().min(8, "At least 8 characters"),
 confirm: z.string(),
 })
 .refine((d) => d.newPassword === d.confirm, {
 message: "Passwords do not match",
 path: ["confirm"],
 });

export default function ProfilePage() {
  const translateUi = useT();
 const t = useT();
 const { data: session } = authClient.useSession();
 const [saving, setSaving] = useState(false);
 const [changingPw, setChangingPw] = useState(false);
 const [showCurrent, setShowCurrent] = useState(false);
 const [showNew, setShowNew] = useState(false);

 const profileForm = useForm<z.infer<typeof profileSchema>>({
 resolver: zodResolver(profileSchema),
 defaultValues: { name: "" },
 });

 useEffect(() => {
 if (session?.user?.name) {
 profileForm.reset({ name: session.user.name });
 }
 }, [session?.user?.name, profileForm]);

 const passwordForm = useForm<z.infer<typeof passwordSchema>>({
 resolver: zodResolver(passwordSchema),
 defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
 });

 async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
 setSaving(true);
 try {
 const { error } = await authClient.updateUser({ name: values.name });
 if (error) throw new Error(error.message);
 toast.success(translateUi("Profile updated"));
 profileForm.reset(values);
 } catch (err) {
 toast.error(err instanceof Error ? err.message : translateUi("Could not update profile"));
 } finally {
 setSaving(false);
 }
 }

 async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
 setChangingPw(true);
 try {
 const { error } = await authClient.changePassword({
 currentPassword: values.currentPassword,
 newPassword: values.newPassword,
 });
 if (error) throw new Error(error.message);
 toast.success(translateUi("Password changed"));
 passwordForm.reset();
 } catch (err) {
 toast.error(err instanceof Error ? err.message : translateUi("Could not change password"));
 } finally {
 setChangingPw(false);
 }
 }

 return (
 <div className="space-y-6">
 <section className="border bg-card p-6">
  <h2 className="text-base font-semibold">{t("Appearance and language")}</h2>
  <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("Choose the language used by the QuickVoice console.")}</p>
  <LanguageSwitcher />
 </section>
 <section className="border bg-card p-6">
 <div className="mb-5 space-y-1">
 <h2 className="text-base font-semibold"><Trans>{"Account"}</Trans></h2>
 <p className="text-sm text-muted-foreground">
 <Trans>{"Your display name and email address."}</Trans>
 </p>
 </div>
 <Form {...profileForm}>
 <form
 onSubmit={profileForm.handleSubmit(onProfileSubmit)}
 className="space-y-5"
 >
 <FormField
 control={profileForm.control}
 name="name"
 render={({ field }) => (
 <FormItem>
 <FormLabel><Trans>{"Name"}</Trans></FormLabel>
 <FormControl>
 <Input {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <div className="space-y-2">
 <FormLabel><Trans>{"Email"}</Trans></FormLabel>
 <Input value={session?.user?.email ?? ""} disabled />
 <FormDescription>
 <Trans>{"Email changes require verification and are managed from the sign-in screen."}</Trans>
 </FormDescription>
 </div>
 <div className="flex justify-end">
 <Button
 type="submit"
 disabled={saving || !profileForm.formState.isDirty}
 >
 {saving ? (
 <>
 <Loader2 className="animate-spin" /> <Trans>{"Saving…"}</Trans>
 </>
 ) : (
 <>
 <Save /> <Trans>{"Save changes"}</Trans>
 </>
 )}
 </Button>
 </div>
 </form>
 </Form>
 </section>

 <section className="border bg-card p-6">
 <div className="mb-5 space-y-1">
 <h2 className="text-base font-semibold"><Trans>{"Change password"}</Trans></h2>
 <p className="text-sm text-muted-foreground">
 <Trans>{"Use at least 8 characters with a mix of letters and numbers."}</Trans>
 </p>
 </div>
 <Form {...passwordForm}>
 <form
 onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
 className="space-y-5"
 >
 <FormField
 control={passwordForm.control}
 name="currentPassword"
 render={({ field }) => (
 <FormItem>
 <FormLabel><Trans>{"Current password"}</Trans></FormLabel>
 <FormControl>
 <InputGroup>
 <InputGroupInput
 type={showCurrent ? "text" : "password"}
 {...field}
 />
 <InputGroupButton
 type="button"
 onClick={() => setShowCurrent((v) => !v)}
 >
 {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
 </InputGroupButton>
 </InputGroup>
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={passwordForm.control}
 name="newPassword"
 render={({ field }) => (
 <FormItem>
 <FormLabel><Trans>{"New password"}</Trans></FormLabel>
 <FormControl>
 <InputGroup>
 <InputGroupInput
 type={showNew ? "text" : "password"}
 {...field}
 />
 <InputGroupButton
 type="button"
 onClick={() => setShowNew((v) => !v)}
 >
 {showNew ? <EyeOffIcon /> : <EyeIcon />}
 </InputGroupButton>
 </InputGroup>
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={passwordForm.control}
 name="confirm"
 render={({ field }) => (
 <FormItem>
 <FormLabel><Trans>{"Confirm new password"}</Trans></FormLabel>
 <FormControl>
 <Input type={showNew ? "text" : "password"} {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <div className="flex justify-end">
 <Button type="submit" disabled={changingPw}>
 {changingPw ? (
 <>
 <Loader2 className="animate-spin" /> <Trans>{"Updating…"}</Trans>
 </>
 ) : (
 <Trans>{"Change password"}</Trans>
 )}
 </Button>
 </div>
 </form>
 </Form>
 </section>
 </div>
 );
}
