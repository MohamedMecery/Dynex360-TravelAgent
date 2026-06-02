import type { Locale } from "@/i18n/config";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";
import { translateMessage } from "@/i18n/translate-utils";

const fallback = en as Record<string, unknown>;
const catalogs: Record<Locale, Record<string, unknown>> = {
  en: fallback,
  ar: ar as Record<string, unknown>,
};

/** @deprecated Prefer next-intl server helpers or useTranslation() in client components. */
export function translate(locale: Locale, key: string): string {
  return translateMessage(catalogs[locale], fallback, key);
}

export type TranslationKey = string;
