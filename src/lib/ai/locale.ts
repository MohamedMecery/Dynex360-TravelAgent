import type { Locale } from "@/i18n/config";

export type AiLocale = Locale;

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

/** True when the text contains Arabic script characters. */
export function containsArabicScript(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
}

export function normalizeAiLocale(value?: string | null): AiLocale {
  return value === "ar" ? "ar" : "en";
}

/**
 * Resolve locale for AI processing: UI preference wins, then message script detection.
 */
export function resolveAiLocale(uiLocale?: string | null, message?: string): AiLocale {
  const normalized = normalizeAiLocale(uiLocale);
  if (normalized === "ar") return "ar";
  if (message && containsArabicScript(message)) return "ar";
  return "en";
}

/** Maps UI/API locale to PostgreSQL knowledge FTS config key. */
export function knowledgeSearchLocaleParam(locale: AiLocale, query: string): "en" | "ar" | "auto" {
  if (locale === "ar") return "ar";
  if (containsArabicScript(query)) return "ar";
  return "en";
}
