"use client";

import { localizeError } from "@/src/i18n/errors";

import { useT } from "@/src/i18n/provider";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  billingApi,
  type CreateTopUpCheckoutInput,
  type UpdateAutoRechargeInput,
} from "@/src/lib/api/resources/billing";
import { queryKeys } from "@/src/lib/query-keys";

export function useBillingSummary(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.billing.summary(organizationId),
    queryFn: billingApi.summary,
    enabled: Boolean(organizationId),
  });
}

export function useBillingTransactions(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.billing.transactions(organizationId),
    queryFn: billingApi.transactions,
    enabled: Boolean(organizationId),
  });
}

export function useCreateTopUpCheckout() {
  const translateUi = useT();
  return useMutation({
    mutationFn: (input: CreateTopUpCheckoutInput) =>
      billingApi.createTopUpCheckout(input),
    onError: (error: Error) => {
      toast.error(localizeError(translateUi, error, "Could not start the top-up"));
    },
  });
}

export function useCreatePaymentMethodSetup() {
  const translateUi = useT();
  return useMutation({
    mutationFn: billingApi.createPaymentMethodSetup,
    onError: (error: Error) => {
      toast.error(localizeError(translateUi, error, "Could not start card setup"));
    },
  });
}

export function useUpdateAutoRecharge() {
  const translateUi = useT();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAutoRechargeInput) =>
      billingApi.updateAutoRecharge(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.billing.all,
      });
      toast.success(translateUi("Auto-recharge settings saved"));
    },
    onError: (error: Error) => {
      toast.error(localizeError(translateUi, error, "Could not save auto-recharge settings"));
    },
  });
}
