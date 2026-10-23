"use client";

import { localizeError } from "@/src/i18n/errors";

import { useT } from "@/src/i18n/provider";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { outboundApi } from "@/src/lib/api/resources/outbound";
import type {
  CreateBatchCampaignInput,
  OutboundCallListParams,
} from "@/src/lib/api/resources/outbound";
import { downloadBlobAsFile } from "@/src/lib/export-csv";
import type { QuickCallInput } from "@/src/models/outbound/quickCall";
import { queryKeys } from "@/src/lib/query-keys";

export function useOutboundCalls(params: OutboundCallListParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.outbound.all, "calls", params] as const,
    queryFn: () => outboundApi.listOutboundCalls(params),
  });
}

export function useOutboundCall(outboundId?: string | null) {
  return useQuery({
    queryKey: [...queryKeys.outbound.all, "call", outboundId ?? null] as const,
    queryFn: () => outboundApi.getOutboundCall(outboundId as string),
    enabled: Boolean(outboundId),
  });
}

export function useCancelOutboundCall() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outboundId: string) =>
      outboundApi.cancelOutboundCall(outboundId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outbound.all });
      qc.invalidateQueries({ queryKey: queryKeys.calls.all });
      toast.success(translateUi("Outbound call cancelled"));
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not cancel outbound call"));
    },
  });
}

export function useRetryOutboundCall() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outboundId: string) =>
      outboundApi.retryOutboundCall(outboundId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outbound.all });
      qc.invalidateQueries({ queryKey: queryKeys.calls.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success(translateUi("Outbound call retry started"));
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not retry outbound call"));
    },
  });
}

export function useQuickOutboundCall() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuickCallInput) => outboundApi.quickCall(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.calls.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.invalidateQueries({ queryKey: queryKeys.outbound.all });
      toast.success(translateUi("Outbound call started"));
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not start outbound call"));
    },
  });
}

export function useBatchCampaigns(agentId?: string) {
  return useQuery({
    queryKey: queryKeys.outbound.batches(agentId),
    queryFn: () => outboundApi.listBatchCampaigns(agentId),
  });
}

export function useBatchCampaign(campaignId?: string | null) {
  return useQuery({
    queryKey: [...queryKeys.outbound.all, "batch", campaignId ?? null] as const,
    queryFn: () => outboundApi.getBatchCampaign(campaignId as string),
    enabled: Boolean(campaignId),
  });
}

export function useCreateBatchCampaign() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchCampaignInput) =>
      outboundApi.createBatchCampaign(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outbound.all });
      toast.success(translateUi("Batch campaign queued"));
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not queue batch campaign"));
    },
  });
}

export function useCancelBatchCampaign() {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) =>
      outboundApi.cancelBatchCampaign(campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outbound.all });
      toast.success(translateUi("Campaign cancelled"));
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not cancel campaign"));
    },
  });
}

export function useDownloadBatchCampaignResults() {
  const translateUi = useT();
  return useMutation({
    mutationFn: (campaignId: string) =>
      outboundApi.downloadBatchCampaignResultsCsv(campaignId),
    onSuccess: ({ blob, filename }) => {
      downloadBlobAsFile(filename, blob);
      toast.success(translateUi("Campaign results downloaded"));
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not download campaign results"));
    },
  });
}
