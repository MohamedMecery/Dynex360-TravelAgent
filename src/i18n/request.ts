import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  let locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  if (cookieLocale && hasLocale(routing.locales, cookieLocale)) {
    locale = cookieLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
