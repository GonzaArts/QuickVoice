"use client";

import { Toaster } from "sonner";
import { useT } from "./provider";

export function LocalizedToaster() {
  const t = useT();
  return <Toaster richColors closeButton containerAriaLabel={t("Notifications")}
    toastOptions={{ closeButtonAriaLabel: t("Close notification") }} />;
}
