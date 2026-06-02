import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME } from "@/i18n/config";
import { resolveRequestLocale } from "@/i18n/resolve-request-locale";

const HEADER_LOCALE_NAME = "X-NEXT-INTL-LOCALE";

/**
 * Attach resolved locale to the request (for next-intl server APIs) and sync cookie.
 * Does not rewrite URLs — pages live at /login not /en/login.
 */
export function applyRequestLocale(request: NextRequest): NextResponse {
  const locale = resolveRequestLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HEADER_LOCALE_NAME, locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const currentCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (currentCookie !== locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}
