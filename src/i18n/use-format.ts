"use client";

import { useCallback } from "react";
import { useTranslation } from "@/i18n/locale-provider";
import { formatCurrency as fmtCurrency, formatDate as fmtDate } from "@/lib/utils";

export function useFormat() {
  const { locale } = useTranslation();

  const formatCurrency = useCallback(
    (amount: number, currency = "USD") => fmtCurrency(amount, currency, locale),
    [locale]
  );

  const formatDate = useCallback(
    (date: string) => fmtDate(date, locale),
    [locale]
  );

  return { formatCurrency, formatDate, locale };
}
