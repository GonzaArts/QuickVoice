"use client";

import { localizeError } from "@/src/i18n/errors";
import { useT, useLocale } from "@/src/i18n/provider";
import { localeCode } from "@/src/i18n/config";

import { Trans } from "@/src/i18n/Trans";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from "react";
import {
  ArrowDown,
  ChevronRight,
  Clock3,
  Loader2,
  PhoneCall,
  PhoneOff,
  Radio,
  RefreshCw,
  Users,
  WifiOff,
  X,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Button } from "@/src/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useCanEndLiveCalls } from "@/src/hooks/use-call-permissions";
import { useEndLiveCall, useLiveCalls } from "@/src/hooks/queries/calls";
import { useLiveTranscript } from "@/src/hooks/use-live-transcript";
import type { LiveCallRoom } from "@/src/lib/api/resources/calls";
import type { LiveTranscriptMessage } from "@/src/lib/live-calls/types";
import { cn } from "@/src/lib/utils";

function directionLabel(direction: LiveCallRoom["direction"], t: (key: string) => string) {
  if (direction === "outbound") return t("Outbound");
  if (direction === "inbound") return t("Inbound");
  return t("Live call");
}

function phoneDetails(call: LiveCallRoom) {
  return {
    from: call.fromNumber ?? call.callerId ?? null,
    to: call.toNumber ?? call.calleeId ?? null,
  };
}

function isWidgetCall(call: LiveCallRoom) {
  return call.roomName.startsWith("widget_") || call.callId.startsWith("widget_");
}

function callTitle(call: LiveCallRoom, t: (key: string) => string) {
  if (isWidgetCall(call)) return t("Website visitor");
  const phone = phoneDetails(call);
  const primary = call.direction === "outbound" ? phone.to : phone.from;
  return primary ?? `${directionLabel(call.direction, t)} ${call.callId.slice(0, 8)}`;
}

function formatElapsed(startedAt: string | null, now: number | null) {
  if (!startedAt || now === null) return "—";
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return "—";
  const totalSeconds = Math.max(0, Math.floor((now - started) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function transcriptTime(timestamp: string, locale: string) {
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function useClock(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [active]);
  return now;
}

function TranscriptRow({ message }: { message: LiveTranscriptMessage }) {
  const { locale } = useLocale();
  const isAgent = message.speaker === "agent";
  return (
    <article
      className={cn(
        "border-t border-[#D9D9DD] py-5",
        !isAgent && "ml-[12%]"
      )}
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p
            className={cn(
              "border px-2 py-1 text-xs font-semibold",
              isAgent
                ? "border-[#002FA7] bg-[#002FA7] text-white"
                : "border-[#D9D9DD] bg-[#F7F7F8] text-[#111111]"
            )}
          >
            {isAgent ? <Trans>{"Agent"}</Trans> : <Trans>{"Caller"}</Trans>}
          </p>
          <time className="shrink-0 text-[11px] tabular-nums text-[#77777F]">
            {transcriptTime(message.timestamp, localeCode(locale))}
          </time>
        </div>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-[#111111]">
          {message.text}
        </p>
      </div>
    </article>
  );
}

function ConnectionStatus({
  state,
  ended,
}: {
  state: ReturnType<typeof useLiveTranscript>["connectionState"];
  ended: boolean;
}) {
  const t = useT();
  const label = ended
    ? t("Call ended")
    : state === "connected"
      ? t("Live")
      : state === "reconnecting"
        ? t("Reconnecting")
        : state === "connecting"
          ? t("Connecting")
          : t("Offline");

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[#4B4B52]">
      <span
        className={cn(
          "size-2 border border-[#77777F] bg-[#F7F7F8]",
          !ended && state === "connected" && "border-[#002FA7] bg-[#002FA7]"
        )}
      />
      {label}
    </span>
  );
}

function LiveTranscriptDrawer({
  call,
  canEndCall,
  now,
  onClose,
}: {
  call: LiveCallRoom | null;
  canEndCall: boolean;
  now: number | null;
  onClose: () => void;
}) {
  const translateUi = useT();
  const transcript = useLiveTranscript(call?.callId ?? null);
  const endCall = useEndLiveCall();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  const [nearBottom, setNearBottom] = useState(true);
  const scrollContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transcript.messages.length || !nearBottom) return;
    const frame = window.requestAnimationFrame(() => {
      const node = scrollContainer.current;
      if (node) node.scrollTop = node.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [nearBottom, transcript.messages]);

  const unseenMessages = nearBottom
    ? 0
    : Math.max(0, transcript.messages.length - lastSeenMessageCount);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    const isNearBottom = distanceFromBottom < 96;
    if (isNearBottom !== nearBottom) {
      setNearBottom(isNearBottom);
      setLastSeenMessageCount(transcript.messages.length);
    }
  }

  function scrollToLatest() {
    const node = scrollContainer.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    setNearBottom(true);
    setLastSeenMessageCount(transcript.messages.length);
  }

  async function confirmEndCall() {
    if (!call || transcript.isEnded) return;
    try {
      await endCall.mutateAsync(call.roomName);
      transcript.markEnded();
      setConfirmEnd(false);
    } catch {
      // The mutation renders the server error through the shared toast handler.
    }
  }

  const phone = call ? phoneDetails(call) : { from: null, to: null };
  const widgetCall = call ? isWidgetCall(call) : false;

  return (
    <>
      <Sheet open={call !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full gap-0 border-l border-[#B8B8BE] bg-[#FFFFFF] p-0 text-[#111111] shadow-none sm:max-w-[42rem]"
        >
          {call ? (
            <>
              <SheetHeader className="gap-0 border-b border-[#B8B8BE] p-0 text-left">
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)]">
                  <div className="border-r border-[#D9D9DD] bg-[#F7F7F8] px-4 py-5">
                    <p className="text-2xl font-semibold tabular-nums text-[#002FA7]">01</p>
                  </div>
                  <div className="min-w-0 px-5 py-5 pr-14">
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <ConnectionStatus
                        state={transcript.connectionState}
                        ended={transcript.isEnded}
                      />
                      <span className="text-xs text-[#77777F]">
                        {directionLabel(call.direction, translateUi)}
                      </span>
                    </div>
                    <SheetTitle className="truncate text-xl font-semibold tracking-[-0.02em] text-[#111111]">
                      {callTitle(call, translateUi)}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-sm text-[#65656D]">
                      {call.agentName
                        ? translateUi("Agent: {name}", { name: call.agentName })
                        : translateUi("Call {id}", { id: call.callId.slice(0, 8) })}
                    </SheetDescription>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-[#D9D9DD] sm:grid-cols-4">
                  <div className="border-r border-b border-[#D9D9DD] px-4 py-3 sm:border-b-0">
                    <p className="text-[11px] text-[#77777F]"><Trans>{"Elapsed"}</Trans></p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[#111111]">
                      {transcript.isEnded ? <Trans>{"Ended"}</Trans> : formatElapsed(call.startedAt, now)}
                    </p>
                  </div>
                  <div className="border-b border-[#D9D9DD] px-4 py-3 sm:border-r sm:border-b-0">
                    <p className="text-[11px] text-[#77777F]"><Trans>{"Participants"}</Trans></p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-[#111111]">
                      {call.participantCount}
                    </p>
                  </div>
                  <div className="border-r border-[#D9D9DD] px-4 py-3">
                    <p className="text-[11px] text-[#77777F]"><Trans>{"From"}</Trans></p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#111111]">
                      {widgetCall ? <Trans>{"Website visitor"}</Trans> : phone.from ?? <Trans>{"Unavailable"}</Trans>}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[11px] text-[#77777F]"><Trans>{"To"}</Trans></p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#111111]">
                      {widgetCall ? <Trans>{"Voice agent"}</Trans> : phone.to ?? <Trans>{"Unavailable"}</Trans>}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="relative min-h-0 flex-1 bg-[#FFFFFF]">
                <div
                  ref={scrollContainer}
                  onScroll={handleScroll}
                  className="absolute inset-0 overflow-y-auto px-5 pb-8 pt-5"
                  aria-live="polite"
                >
                  <div className="mb-5 flex items-baseline justify-between gap-4">
                    <h2 className="text-sm font-semibold text-[#111111]"><Trans>{"Live transcript"}</Trans></h2>
                    <p className="text-xs tabular-nums text-[#77777F]">
                      {transcript.messages.length} <Trans>{"finalized"}</Trans>
                    </p>
                  </div>

                  {transcript.error ? (
                    <div className="mb-4 flex items-start gap-2 border border-[#B8B8BE] bg-[#F7F7F8] p-3 text-sm text-[#4B4B52]">
                      <WifiOff className="mt-0.5 size-4 shrink-0" />
                      <p>{localizeError(translateUi, transcript.error, "Transcript history did not respond. Reconnecting will retry.")}</p>
                    </div>
                  ) : null}

                  {transcript.replayState !== "ready" &&
                  transcript.messages.length === 0 ? (
                    <div className="border-t border-[#D9D9DD] py-8 text-sm text-[#65656D]">
                      <Loader2 className="mb-3 size-4 animate-spin text-[#002FA7]" />
                      <Trans>{"Loading transcript from the start…"}</Trans>
                    </div>
                  ) : transcript.messages.length === 0 ? (
                    <div className="border-t border-[#D9D9DD] py-8">
                      <p className="text-sm font-medium text-[#111111]">
                        <Trans>{"Waiting for the first finalized message"}</Trans>
                      </p>
                      <p className="mt-1 text-sm text-[#65656D]">
                        <Trans>{"Messages appear here after each speaker finishes a turn."}</Trans>
                      </p>
                    </div>
                  ) : (
                    <div>
                      {transcript.messages.map((message) => (
                        <TranscriptRow
                          key={message.messageId}
                          message={message}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {unseenMessages > 0 ? (
                  <Button
                    type="button"
                    onClick={scrollToLatest}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-none border border-[#002FA7] bg-[#002FA7] text-white hover:bg-[#002785]"
                  >
                    <ArrowDown className="size-4" />
                    {unseenMessages} <Trans>{"new"}</Trans> {unseenMessages === 1 ? <Trans>{"message"}</Trans> : <Trans>{"messages"}</Trans>}
                  </Button>
                ) : null}
              </div>

              <SheetFooter className="border-t border-[#B8B8BE] bg-[#F7F7F8] p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-[#65656D]">
                    {transcript.isEnded
                      ? <Trans>{"This transcript is no longer receiving messages."}</Trans>
                      : <Trans>{"Finalized turns are saved here during the live call."}</Trans>}
                  </p>
                  {canEndCall && !transcript.isEnded ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-none border-[#111111] bg-[#FFFFFF] text-[#111111] hover:bg-[#111111] hover:text-white"
                      onClick={() => setConfirmEnd(true)}
                      disabled={endCall.isPending}
                    >
                      {endCall.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PhoneOff className="size-4" />
                      )}
                      <Trans>{"End call"}</Trans>
                    </Button>
                  ) : null}
                </div>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent className="rounded-none border-[#B8B8BE] bg-[#FFFFFF] text-[#111111]">
          <AlertDialogHeader>
            <AlertDialogTitle><Trans>{"End this live call?"}</Trans></AlertDialogTitle>
            <AlertDialogDescription className="text-[#65656D]">
              <Trans>{"The caller and agent on"}</Trans> {call ? callTitle(call, translateUi) : <Trans>{"this call"}</Trans>} <Trans>{"will be disconnected immediately."}</Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endCall.isPending} className="rounded-none">
              <Trans>{"Cancel"}</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmEndCall();
              }}
              disabled={endCall.isPending}
              className="rounded-none bg-[#111111] text-white hover:bg-[#333333]"
            >
              {endCall.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              <Trans>{"End call"}</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function LiveCallsDock({ organizationId }: { organizationId: string }) {
  const translateUi = useT();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<LiveCallRoom | null>(null);
  const [restoreCallId, setRestoreCallId] = useState<string | null>(null);
  const liveCalls = useLiveCalls(true);
  const canEndCall = useCanEndLiveCalls(organizationId);
  const now = useClock(true);
  const storageKey = `quickvoice:live-call:${organizationId}`;

  const sortedCalls = useMemo(
    () =>
      dedupeLiveCalls(liveCalls.data ?? []).sort((left, right) =>
        (right.startedAt ?? "").localeCompare(left.startedAt ?? "")
      ),
    [liveCalls.data]
  );

  useEffect(() => {
    setRestoreCallId(window.localStorage.getItem(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!restoreCallId) return;
    const restored = sortedCalls.find((call) => call.callId === restoreCallId);
    if (restored) {
      setSelectedCall(restored);
      setRestoreCallId(null);
      return;
    }
    if (!liveCalls.isLoading && !liveCalls.isFetching) {
      window.localStorage.removeItem(storageKey);
      setRestoreCallId(null);
    }
  }, [liveCalls.isFetching, liveCalls.isLoading, restoreCallId, sortedCalls, storageKey]);

  useEffect(() => {
    if (!selectedCall) return;
    const updated = sortedCalls.find(
      (call) =>
        call.callId === selectedCall.callId ||
        call.roomName === selectedCall.roomName
    );
    if (updated && updated !== selectedCall) setSelectedCall(updated);
    // Updating metadata should follow query-cache changes without closing an ended call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCall?.callId, sortedCalls]);

  function openCall(call: LiveCallRoom) {
    setSelectedCall(call);
    setPanelOpen(false);
    window.localStorage.setItem(storageKey, call.callId);
  }

  function closeCall() {
    setSelectedCall(null);
    window.localStorage.removeItem(storageKey);
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 font-sans">
        {panelOpen ? (
          <section
            id="live-call-list"
            className="w-[min(25rem,calc(100vw-2rem))] border border-[#B8B8BE] bg-[#FFFFFF] text-[#111111]"
          >
            <header className="grid grid-cols-[4rem_minmax(0,1fr)_auto] border-b border-[#B8B8BE]">
              <div className="flex items-center justify-center border-r border-[#D9D9DD] bg-[#F7F7F8] text-2xl font-semibold tabular-nums text-[#002FA7]">
                {String(sortedCalls.length).padStart(2, "0")}
              </div>
              <div className="min-w-0 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-[#002FA7]" />
                  <h2 className="text-sm font-semibold"><Trans>{"Live calls"}</Trans></h2>
                </div>
                <p className="mt-1 text-xs text-[#65656D]">
                  {sortedCalls.length === 1
                    ? <Trans>{"1 active call"}</Trans>
                    : translateUi("{count} active calls", { count: sortedCalls.length })}
                </p>
              </div>
              <div className="flex items-center border-l border-[#D9D9DD]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-none text-[#111111] hover:bg-[#F7F7F8]"
                  onClick={() => liveCalls.refetch()}
                  disabled={liveCalls.isFetching}
                  aria-label={translateUi("Refresh live calls")}
                >
                  <RefreshCw
                    className={cn("size-4", liveCalls.isFetching && "animate-spin")}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-none border-l border-[#D9D9DD] text-[#111111] hover:bg-[#F7F7F8]"
                  onClick={() => setPanelOpen(false)}
                  aria-label={translateUi("Close live calls")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </header>

            <div className="max-h-[min(31rem,calc(100vh-9rem))] overflow-y-auto">
              {liveCalls.isError ? (
                <div className="m-3 border border-[#B8B8BE] bg-[#F7F7F8] p-4">
                  <p className="text-sm font-medium"><Trans>{"Live calls are unavailable"}</Trans></p>
                  <p className="mt-1 text-xs text-[#65656D]">
                    <Trans>{"Check the connection and refresh this list."}</Trans>
                  </p>
                </div>
              ) : liveCalls.isLoading ? (
                <div className="space-y-px bg-[#D9D9DD]">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="bg-[#FFFFFF] p-4">
                      <Skeleton className="h-4 w-2/3 rounded-none bg-[#F0F0F2]" />
                      <Skeleton className="mt-3 h-3 w-1/2 rounded-none bg-[#F0F0F2]" />
                    </div>
                  ))}
                </div>
              ) : sortedCalls.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <PhoneCall className="mx-auto size-5 text-[#77777F]" />
                  <p className="mt-3 text-sm font-medium"><Trans>{"No active calls"}</Trans></p>
                  <p className="mt-1 text-xs text-[#65656D]">
                    <Trans>{"New calls will appear here automatically."}</Trans>
                  </p>
                </div>
              ) : (
                <ol>
                  {sortedCalls.map((call, index) => (
                    <li key={call.callId} className="border-b border-[#D9D9DD] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openCall(call)}
                        className="group grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center text-left transition-colors hover:bg-[#F7F7F8] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#002FA7]"
                      >
                        <span className="self-stretch border-r border-[#D9D9DD] px-3 py-4 text-xs font-semibold tabular-nums text-[#002FA7]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 px-4 py-4">
                          <span className="block truncate text-sm font-semibold">
                            {callTitle(call, translateUi)}
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#65656D]">
                            <span>{directionLabel(call.direction, translateUi)}</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock3 className="size-3" />
                              {formatElapsed(call.startedAt, now)}
                            </span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Users className="size-3" />
                              {call.participantCount}
                            </span>
                          </span>
                          {call.agentName ? (
                            <span className="mt-1 block truncate text-xs text-[#65656D]">
                              <Trans>{"Agent:"}</Trans> {call.agentName}
                            </span>
                          ) : null}
                        </span>
                        <ChevronRight className="mr-4 size-4 text-[#77777F] transition-transform group-hover:translate-x-0.5 group-hover:text-[#002FA7]" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        ) : null}

        <Button
          type="button"
          onClick={() => setPanelOpen((current) => !current)}
          aria-expanded={panelOpen}
          aria-controls="live-call-list"
          className="h-12 rounded-none border border-[#002FA7] bg-[#002FA7] px-4 text-white shadow-none hover:bg-[#002785]"
        >
          {liveCalls.isFetching && !liveCalls.data ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          <Trans>{"Live calls"}</Trans>
          <span className="ml-1 border-l border-white/40 pl-3 tabular-nums">
            {String(sortedCalls.length).padStart(2, "0")}
          </span>
        </Button>
      </div>

      <LiveTranscriptDrawer
        key={selectedCall?.callId ?? "no-live-call"}
        call={selectedCall}
        canEndCall={canEndCall}
        now={now}
        onClose={closeCall}
      />
    </>
  );
}

function dedupeLiveCalls(calls: LiveCallRoom[]) {
  const merged: LiveCallRoom[] = [];
  for (const call of calls) {
    const existingIndex = merged.findIndex(
      (existing) =>
        existing.callId === call.callId || existing.roomName === call.roomName
    );
    if (existingIndex === -1) {
      merged.push(call);
      continue;
    }
    const existing = merged[existingIndex]!;
    merged[existingIndex] = {
      ...existing,
      participantCount: Math.max(existing.participantCount, call.participantCount),
      direction: existing.direction === "unknown" ? call.direction : existing.direction,
      startedAt: existing.startedAt ?? call.startedAt,
      agentId: existing.agentId ?? call.agentId,
      agentName: existing.agentName ?? call.agentName,
      callerId: existing.callerId ?? call.callerId,
      calleeId: existing.calleeId ?? call.calleeId,
      fromNumber: existing.fromNumber ?? call.fromNumber,
      toNumber: existing.toNumber ?? call.toNumber,
    };
  }
  return merged;
}
