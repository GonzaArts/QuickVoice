"use client";

import { useT } from "@/src/i18n/provider";
import { useLocale } from "@/src/i18n/provider";
import { localeCode } from "@/src/i18n/config";
import { localizeError } from "@/src/i18n/errors";

import { Trans } from "@/src/i18n/Trans";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MapPin, Phone, PhoneCall, Search, Plus, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/src/components/ui/command";
import { ApiError } from "@/src/lib/errors";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/common/EmptyState";
import { useBuyNumber, useNumberCountries, useNumberSearch } from "@/src/hooks/queries/numbers";
import type { NumberSearchParams } from "@/src/lib/api/resources/numbers";
import type { AvailableNumber } from "@/src/lib/api/types";

const schema = z.object({
  provider: z.enum(["TWILIO", "TELNYX"]),
  country: z.string().length(2, "ISO-3166 alpha-2 country code").toUpperCase(),
  areaCode: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
function formatMonthlyPrice(value: AvailableNumber["monthlyPriceMicros"], locale: string) {
  if (value === null || value === undefined) return null;
  const micros = Number(value);
  if (!Number.isFinite(micros)) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(micros / 1_000_000);
}

function quoteExpiryMs(value: string) {
  const expiryMs = Date.parse(value);
  return Number.isFinite(expiryMs) ? expiryMs : null;
}

function isQuoteExpired(value: string, nowMs: number) {
  const expiryMs = quoteExpiryMs(value);
  return expiryMs === null || expiryMs <= nowMs;
}

export function BuyNumberDrawer() {
  const translateUi = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<NumberSearchParams | null>(
    null,
  );
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [quoteClock, setQuoteClock] = useState(() => Date.now());

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { provider: "TWILIO", country: "US", areaCode: "" },
  });
  const watchedProvider = useWatch({ control: form.control, name: "provider" });
  const watchedCountry = useWatch({ control: form.control, name: "country" });
  const watchedAreaCode = useWatch({ control: form.control, name: "areaCode" });

  const search = useNumberSearch(searchParams, !!searchParams);
  const buy = useBuyNumber();
  const countries = useNumberCountries(watchedProvider, open);
  const selectedCountry = countries.data?.find((country) => country.code === watchedCountry);
  const providerName = watchedProvider === "TWILIO" ? "Twilio" : "Telnyx";
  const unsupportedCountry = search.error instanceof ApiError && search.error.code === "NUMBER_COUNTRY_NOT_SUPPORTED";

  useEffect(() => {
    if (!open || !search.data?.length) return;
    const nextExpiry = search.data.reduce<number | null>((next, number) => {
      const expiryMs = quoteExpiryMs(number.quoteExpiresAt);
      if (expiryMs === null || expiryMs <= quoteClock) return next;
      return next === null || expiryMs < next ? expiryMs : next;
    }, null);
    if (nextExpiry === null) return;

    const timeout = window.setTimeout(
      () => setQuoteClock(Date.now()),
      Math.max(0, nextExpiry - Date.now() + 25),
    );
    return () => window.clearTimeout(timeout);
  }, [open, quoteClock, search.data]);

  function onSubmit(values: FormValues) {
    if (!selectedCountry || countries.isError) return;
    setQuoteClock(Date.now());
    if (searchParams?.provider === values.provider && searchParams.country === values.country &&
        (searchParams.areaCode ?? "") === (values.areaCode ?? "")) {
      void search.refetch();
      return;
    }
    setSearchParams({
      provider: values.provider,
      country: values.country,
      areaCode: values.areaCode || undefined,
      limit: 12,
    });
  }

  async function onBuy(number: AvailableNumber) {
    if (!searchParams || buyingNumber) return;
    const nowMs = Date.now();
    if (isQuoteExpired(number.quoteExpiresAt, nowMs)) {
      setQuoteClock(nowMs);
      toast.error(translateUi("Quote expired. Search again for current pricing."));
      return;
    }
    setBuyingNumber(number.phoneNumber);
    try {
      await buy.mutateAsync({
        provider: searchParams.provider,
        phoneNumber: number.phoneNumber,
        quoteId: number.quoteId,
      });
      setOpen(false);
      form.reset();
      setSearchParams(null);
    } catch {
      // The mutation hook displays the API error; keep the selected number for retry.
    } finally {
      setBuyingNumber(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> <Trans>{"Buy number"}</Trans>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(94vw,940px)] data-[side=right]:sm:max-w-none">
        <SheetHeader className="shrink-0 border-b px-6 py-5">
          <SheetTitle><Trans>{"Buy a phone number"}</Trans></SheetTitle>
          <SheetDescription>
            <Trans>{"Search available numbers from your telephony provider and purchase one for this organization."}</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 border-b bg-muted/20 px-6 py-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-4 md:grid-cols-[0.8fr_1.4fr_0.7fr_auto] md:items-start"
            >
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel><Trans>{"Provider"}</Trans></FormLabel>
                    <Select value={field.value} disabled={buy.isPending} onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("country", "");
                      form.setValue("areaCode", "");
                      setSearchParams(null);
                    }}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TWILIO">Twilio</SelectItem>
                        <SelectItem value="TELNYX">Telnyx</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel><Trans>{"Country"}</Trans></FormLabel>
                    {/* Give the portaled list its own scroll lock inside the modal sheet. */}
                    <Popover modal open={countryOpen} onOpenChange={setCountryOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={countryOpen}
                            disabled={buy.isPending || countries.isPending || countries.isError}
                            className="w-full min-w-0 justify-between font-normal"
                          >
                            <span className="truncate">
                              {countries.isPending ? <Trans>{"Loading countries…"}</Trans> : selectedCountry
                                ? `${selectedCountry.name} (${selectedCountry.code})` : <Trans>{"Select country"}</Trans>}
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] overflow-hidden p-0">
                        <Command>
                          <CommandInput placeholder={translateUi("Search country or code…")} aria-label={translateUi("Search country or code")} />
                          <CommandList>
                            <CommandEmpty className="px-3 py-5 text-left">
                              <p className="font-medium"><Trans>{"Country not available"}</Trans></p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                <Trans>{"No supported country matches your search. Local numbers are not provided in all countries by"}</Trans> {providerName}.
                              </p>
                            </CommandEmpty>
                            {countries.data?.map((country) => (
                              <CommandItem key={country.code} value={`${country.name} ${country.code}`}
                                data-checked={field.value === country.code}
                                onSelect={() => {
                                  field.onChange(country.code);
                                  form.setValue("areaCode", "");
                                  setSearchParams(null);
                                  setCountryOpen(false);
                                }}>
                                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                                <span className="text-xs text-muted-foreground">{country.code}</span>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-[11px]">
                      <Trans>{"Countries offering local numbers through"}</Trans> {providerName}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaCode"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel><Trans>{"Area code"}</Trans></FormLabel>
                    <FormControl>
                      <Input placeholder="415" {...field} disabled={buy.isPending} onChange={(event) => {
                        field.onChange(event);
                        setSearchParams(null);
                      }} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={search.isFetching || buy.isPending || !selectedCountry || countries.isError}
                className="w-full md:mt-6 lg:w-auto"
              >
                {search.isFetching ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
                <Trans>{"Search"}</Trans>
              </Button>
            </form>
          </Form>
          <p className="mt-3 text-xs text-muted-foreground lg:hidden">
            <Trans>{"Rentals use paid credit. Promotional credit cannot buy or renew numbers."}</Trans>
          </p>
          {countries.isError ? (
            <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive">
              <span><Trans>{"Could not load countries from"}</Trans> {providerName}<Trans>{". Please try again."}</Trans></span>
              <Button type="button" variant="outline" size="sm" disabled={countries.isFetching}
                onClick={() => void countries.refetch()}><Trans>{"Retry countries"}</Trans></Button>
            </div>
          ) : countries.isSuccess && !countries.data.length ? (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              <Trans>{"No countries with local voice numbers are currently provided by"}</Trans> {providerName}<Trans>{". Try another provider."}</Trans>
            </p>
          ) : countries.isSuccess && watchedCountry && !selectedCountry ? (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              <Trans>{"Local numbers are not provided in this country by"}</Trans> {providerName}<Trans>{". Select another country."}</Trans>
            </p>
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block border-b bg-muted/10 px-6 py-5 lg:border-r lg:border-b-0">
            <div className="rounded-xl border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">
                <Trans>{"Search criteria"}</Trans>
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Trans>{"Provider"}</Trans>
                  </dt>
                  <dd className="mt-1 capitalize text-foreground">
                    {watchedProvider}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Trans>{"Country"}</Trans>
                  </dt>
                  <dd className="mt-1 font-mono text-foreground">
                    {selectedCountry?.name || <Trans>{"Select a country"}</Trans>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Trans>{"Area code"}</Trans>
                  </dt>
                  <dd className="mt-1 font-mono text-foreground">
                    {watchedAreaCode || <Trans>{"Any"}</Trans>}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                <Trans>{"Phone numbers start at $2 per 30 days. Promotional credit cannot buy or renew numbers; rental is charged from paid credit."}</Trans>
              </p>
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {!searchParams ? (
              <EmptyState
                icon={Phone}
                title="Search available numbers"
                description="Pick a provider, country, and optional area code."
                className="border-0"
              />
            ) : search.isFetching ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : search.isError ? (
              <EmptyState
                icon={Phone}
                title={translateUi(unsupportedCountry ? "Not provided in this country" : "Search failed")}
                description={unsupportedCountry ? translateUi("The number search is unavailable in this country.") : localizeError(translateUi, search.error, "The provider could not complete this search. Please try again.")}
                className="border-0"
              />
            ) : !search.data?.length ? (
              <EmptyState
                icon={Phone}
                title="No numbers found"
                description="No local voice numbers match this search right now. Try another area code or search again later."
                className="border-0"
              />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {search.data.map((n) => {
                  const monthlyPrice = formatMonthlyPrice(n.monthlyPriceMicros, localeCode(locale));
                  const quoteExpired = isQuoteExpired(
                    n.quoteExpiresAt,
                    quoteClock,
                  );
                  return (
                    <div
                      key={n.phoneNumber}
                      className="rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-500">
                          <PhoneCall className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-base font-semibold text-foreground">
                            {n.phoneNumber}
                          </p>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {[n.locality, n.region, n.isoCountry]
                              .filter(Boolean)
                              .join(" · ") || <Trans>{"Location unavailable"}</Trans>}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {monthlyPrice ?? <Trans>{"Price confirmed before purchase"}</Trans>}
                            {monthlyPrice ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                <Trans>{"/ 30 days"}</Trans>
                              </span>
                            ) : null}
                          </p>
                          {quoteExpired ? (
                            <p
                              className="mt-1 text-[11px] font-medium text-destructive"
                              role="alert"
                            >
                              <Trans>{"Quote expired — search again"}</Trans>
                            </p>
                          ) : n.quoteExpiresAt ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              <Trans>{"Quote expires"}</Trans>{" "}
                                {new Date(n.quoteExpiresAt).toLocaleTimeString(
                                localeCode(locale),
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onBuy(n)}
                        disabled={buy.isPending || quoteExpired}
                        className="mt-4 w-full"
                      >
                        {quoteExpired ? (
                          <Trans>{"Quote expired — search again"}</Trans>
                        ) : buyingNumber === n.phoneNumber ? (
                          <>
                            <Loader2 className="animate-spin" /> <Trans>{"Buying…"}</Trans>
                          </>
                        ) : monthlyPrice ? (
                          translateUi("Buy for {amount}", { amount: monthlyPrice })
                        ) : (
                          <Trans>{"Buy this number"}</Trans>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
