import { defineRouting } from "next-intl/routing";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALES,
} from "@/i18n/config";

/**
 * Active UI locales. To add Spanish, Portuguese, French, or German:
 * 1. Add code to LOCALES in config.ts
 * 2. Add messages/{locale}.json
 * 3. Register in LOCALE_LABELS / LOCALE_DIRECTION
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "never",
  localeDetection: true,
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
    maxAge: LOCALE_COOKIE_MAX_AGE,
  },
});
