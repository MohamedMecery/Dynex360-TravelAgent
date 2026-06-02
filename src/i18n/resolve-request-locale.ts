import type { NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { routing } from "@/i18n/routing";

/** Resolve UI locale from cookie or Accept-Language (no path prefix). */
export function resolveRequestLocale(request: NextRequest): string {
  const cookieValue = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieValue && hasLocale(routing.locales, cookieValue)) {
    return cookieValue;
  }

  if (routing.localeDetection) {
    const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
    for (const locale of routing.locales) {
      if (acceptLanguage.includes(locale)) {
        return locale;
      }
    }
  }

  return routing.defaultLocale;
}
