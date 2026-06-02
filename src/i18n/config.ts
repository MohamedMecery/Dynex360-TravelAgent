/** Active UI locales (next-intl). */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

/** Planned locales — add to LOCALES + messages/{code}.json when ready. */
export const FUTURE_LOCALES = ["es", "pt", "fr", "de"] as const;
export type FutureLocale = (typeof FUTURE_LOCALES)[number];

export type AppLocale = Locale | FutureLocale;

export const DEFAULT_LOCALE: Locale = "en";

/** HTTP cookie used by next-intl middleware and the language switcher. */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** @deprecated localStorage key from pre-next-intl UI — migrated on first load. */
export const LOCALE_STORAGE_KEY = "travelos-locale";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

export const LOCALE_DIRECTION: Record<AppLocale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
  es: "ltr",
  pt: "ltr",
  fr: "ltr",
  de: "ltr",
};

export function isRtlLocale(locale: string): boolean {
  return LOCALE_DIRECTION[locale as AppLocale] === "rtl";
}

export function isActiveLocale(locale: string): locale is Locale {
  return (LOCALES as readonly string[]).includes(locale);
}
