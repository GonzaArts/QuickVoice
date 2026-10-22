"use client";

import { useT } from "@/src/i18n/provider";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  kbApi,
  type CreateKbInput,
  type UpdateKbInput,
} from "@/src/lib/api/resources/kb";
import { queryKeys } from "@/src/lib/query-keys";

export function useKbSources(agentId?: string) {
  const qc = useQueryClient();
  const lastActiveSources = useRef<string | null>(null);
  const query = useQuery({
    queryKey: queryKeys.kb.list(agentId),
    queryFn: () => kbApi.list(agentId),
    refetchInterval: (query) =>
      query.state.data?.some((source) => source.status === "PROCESSING")
        ? 2_000
        : false,
  });
  const activeSources = query.data
    ? query.data.filter((source) => source.status === "ACTIVE")
        .map((source) => `${source.kbId}:${source.agentId ?? ""}`)
        .sort()
        .join("|")
    : null;
  useEffect(() => {
    if (activeSources === null || activeSources === lastActiveSources.current) return;
    lastActiveSources.current = activeSources;
    void qc.invalidateQueries({ queryKey: queryKeys.agents.all });
  }, [activeSources, qc]);
  return query;
}

export function useCreateKb() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKbInput) => kbApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.all });
      toast.success(translateUi("Document added"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not add document"));
    },
  });
}

export function useUpdateKb() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, input }: { kbId: string; input: UpdateKbInput }) =>
      kbApi.update(kbId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.all });
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
      toast.success(translateUi("Document updated and queued for processing"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not update document"));
    },
  });
}

export function useDeleteKb() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kbId: string) => kbApi.remove(kbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.all });
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
      toast.success(translateUi("Document deleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not delete document"));
    },
  });
}

export function useRetryKb() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kbId: string) => kbApi.retry(kbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.all });
      toast.success(translateUi("Document queued for retry"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not retry document"));
    },
  });
}
