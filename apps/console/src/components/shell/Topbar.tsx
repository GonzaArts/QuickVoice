"use client";

import { Separator } from "@/src/components/ui/separator";
import { SidebarTrigger } from "@/src/components/ui/sidebar";
import { Breadcrumbs } from "@/src/components/shell/Breadcrumbs";
import { LanguageSwitcher } from "@/src/components/shell/LanguageSwitcher";
import { usePageActionsSlot } from "@/src/components/shell/PageActionsSlot";

export function Topbar() {
  const { slot } = usePageActionsSlot();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumbs />
        <div className="ml-auto flex items-center gap-2"><LanguageSwitcher compact />{slot}</div>
      </div>
    </header>
  );
}
