"use client";

import { useT } from "@/src/i18n/provider";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/src/lib/query-keys";
import {
  widgetsApi,
  type CreateAgentWidgetInput,
  type UpdateAgentWidgetInput,
} from "@/src/lib/api/resources/widgets";

export function useAgentWidgets(agentId: string) {
  return useQuery({
    queryKey: queryKeys.agents.widgets(agentId),
    queryFn: () => widgetsApi.listForAgent(agentId),
    enabled: !!agentId,
  });
}

export function useCreateAgentWidget(agentId: string) {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentWidgetInput) =>
      widgetsApi.createForAgent(agentId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.widgets(agentId) });
      toast.success(translateUi("Widget created"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not create widget"));
    },
  });
}

export function useUpdateAgentWidget(agentId: string, widgetId: string) {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAgentWidgetInput) =>
      widgetsApi.update(widgetId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.widgets(agentId) });
      toast.success(translateUi("Widget saved"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not save widget"));
    },
  });
}

export function useDeleteAgentWidget(agentId: string) {
  const translateUi = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (widgetId: string) => widgetsApi.remove(widgetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.widgets(agentId) });
      toast.success(translateUi("Widget deleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || translateUi("Could not delete widget"));
    },
  });
}
