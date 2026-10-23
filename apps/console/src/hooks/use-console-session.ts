"use client";

import { useSyncExternalStore } from "react";
import { authClient } from "@/src/lib/auth-client";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useIsHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

// Better Auth can populate its client store before a page hydrates. Keep the
// first client render identical to SSR, then reveal the current session.
export function useConsoleSession() {
  const session = authClient.useSession();
  const hydrated = useIsHydrated();
  return {
    ...session,
    data: hydrated ? session.data : undefined,
    isPending: !hydrated || session.isPending,
  };
}
