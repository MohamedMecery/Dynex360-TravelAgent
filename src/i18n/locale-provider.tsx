"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useLocale, useMessages } from "next-intl";
import {
  isActiveLocale,
  isRtlLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/i18n/config";
import { useRouter, usePathname } from "@/i18n/navigation";
import { translateMessage } from "@/i18n/translate-utils";
import en from "../../messages/en.json";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

/**
 * Compatibility hook — same API as the legacy locale provider.
 * Backed by next-intl (cookie-based locale, messages from /messages).
 */
export function useTranslation(): LocaleContextValue {
  const locale = useLocale() as Locale;
  const messages = useMessages() as Record<string, unknown>;
  const router = useRouter();
  const pathname = usePathname();

  const t = useCallback(
    (key: string) => translateMessage(messages, en as Record<string, unknown>, key),
    [messages]
  );

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      router.replace(pathname, { locale: next });
    },
    [locale, pathname, router]
  );

  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return useMemo(
    () => ({ locale, setLocale, t, dir, isRtl: dir === "rtl" }),
    [locale, setLocale, t, dir]
  );
}

/** One-time migration from localStorage to NEXT_LOCALE cookie (pre-next-intl). */
export function LocaleStorageMigration() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!stored || !isActiveLocale(stored)) return;

    document.cookie = `${LOCALE_COOKIE_NAME}=${stored};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    router.replace(pathname, { locale: stored });
  }, [pathname, router]);

  return null;
}

/** @deprecated next-intl wraps the app in layout — pass-through for existing tree. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LocaleStorageMigration />
      {children}
    </>
  );
}

/** Translate enum/status values (bookingStatus.confirmed, etc.) */
export function useStatusTranslation(namespace: string) {
  const { t } = useTranslation();
  return useCallback((value: string) => t(`${namespace}.${value}`), [t, namespace]);
}
