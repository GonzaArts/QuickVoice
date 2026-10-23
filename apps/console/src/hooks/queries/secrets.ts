"use client";

import { localizeError } from "@/src/i18n/errors";

import { useT } from "@/src/i18n/provider";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  secretsApi,
  type CreateSecretInput,
} from "@/src/lib/api/resources/secrets";
import { queryKeys } from "@/src/lib/query-keys";

export function useSecrets() {
  return useQuery({
    queryKey: queryKeys.secrets.list(),
    queryFn: () => secretsApi.list(),
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useCreateSecret() {
  const translateUi = useT();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSecretInput) => secretsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.secrets.list() });
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not create secret"));
    },
  });
}

export function useDeleteSecret() {
  const translateUi = useT();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (secretId: string) => secretsApi.remove(secretId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.secrets.list() });
    },
    onError: (err: Error) => {
      toast.error(localizeError(translateUi, err, "Could not delete secret"));
    },
  });
}
