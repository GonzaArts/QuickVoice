"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Bot,
  Phone,
  PhoneCall,
  PhoneOutgoing,
  BookOpen,
  Settings2,
  Wrench,
  KeyRound,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import { NavMain, type NavItem } from "@/src/components/shell/NavMain";
import { useT } from "@/src/i18n/provider";
import { OrgSwitcher } from "@/src/components/shell/OrgSwitcher";
import { NavUser, type NavUserProps } from "@/src/components/shell/NavUser";

const primaryNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", href: "/agents", icon: Bot },
  { title: "Phone numbers", href: "/numbers", icon: Phone },
  { title: "Outbound", href: "/outbound", icon: PhoneOutgoing },
  { title: "Call logs", href: "/calls", icon: PhoneCall },
  { title: "Knowledge base", href: "/kb", icon: BookOpen },
  { title: "Tools", href: "/tools", icon: Wrench },
  { title: "Secrets", href: "/secrets", icon: KeyRound },
];

const settingsNav: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings2,
    items: [
      { title: "Profile", href: "/settings/profile" },
      { title: "Organization", href: "/settings/organization" },
      { title: "Billing", href: "/settings/billing" },
      { title: "API keys", href: "/settings/api-keys" },
      { title: "Roles", href: "/settings/roles" },
      { title: "Danger zone", href: "/settings/danger" },
    ],
  },
];

function ThemeToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip={t(`Switch to ${nextTheme} mode`)}
          aria-label={t(`Switch to ${nextTheme} mode`)}
          onClick={() => setTheme(nextTheme)}
          className="h-11 !bg-transparent px-3 text-[15px] font-medium text-muted-foreground shadow-none transition-colors hover:!bg-sidebar-accent/60 hover:text-sidebar-foreground [&_svg]:size-[18px] [&_svg]:text-muted-foreground hover:[&_svg]:text-sidebar-foreground"
        >
          <Icon />
          <span>{t(`Switch to ${nextTheme} mode`)}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({
  activeOrgId,
  user,
  ...props
}: {
  activeOrgId: string;
  user: NavUserProps;
} & React.ComponentProps<typeof Sidebar>) {
  const t = useT();
  const localizedPrimaryNav = primaryNav.map((item) => ({ ...item, title: t(item.title) }));
  const localizedSettingsNav = settingsNav.map((item) => ({
    ...item,
    title: t(item.title),
    items: item.items?.map((child) => ({ ...child, title: t(child.title) })),
  }));
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/60 p-3.5">
        <OrgSwitcher activeOrgId={activeOrgId} />
      </SidebarHeader>
      <SidebarContent className="gap-1 py-2.5">
        <NavMain label={t("Platform")} items={localizedPrimaryNav} />
        <SidebarSeparator className="mx-5 bg-sidebar-border/50" />
        <NavMain label={t("Workspace")} items={localizedSettingsNav} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60 p-3.5">
        <ThemeToggle />
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
