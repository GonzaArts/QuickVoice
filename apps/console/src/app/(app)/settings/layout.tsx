"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
 AlertTriangle,
 CreditCard,
 KeyRound,
 Shield,
 User,
 Building2,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useT } from "@/src/i18n/provider";

const NAV = [
 { href: "/settings/profile", label: "Profile", icon: User },
 { href: "/settings/organization", label: "Organization", icon: Building2 },
 { href: "/settings/billing", label: "Billing", icon: CreditCard },
 { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
 { href: "/settings/roles", label: "Roles", icon: Shield },
 { href: "/settings/danger", label: "Danger zone", icon: AlertTriangle },
];

export default function SettingsLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const pathname = usePathname();
 const t = useT();

 return (
 <div className="flex flex-col gap-6">
 <div className="space-y-1 border-b pb-5">
 <h1 className="text-2xl font-semibold tracking-tight">{t("Settings")}</h1>
 <p className="text-sm text-muted-foreground">
 {t("Manage your account, organization, billing, and access control.")}
 </p>
 </div>
 <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
 <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
 {NAV.map((item) => {
 const active = pathname === item.href;
 return (
 <Link
 key={item.href}
 href={item.href}
 className={cn(
 "inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors",
 active
 ? "bg-primary/10 font-medium text-primary"
 : "text-muted-foreground hover:bg-muted hover:text-foreground"
 )}
 >
 <item.icon className="size-4" />
 <span>{t(item.label)}</span>
 </Link>
 );
 })}
 </nav>
 <div>{children}</div>
 </div>
 </div>
 );
}
