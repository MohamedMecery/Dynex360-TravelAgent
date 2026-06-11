import { I18n } from "i18n-js";
import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";

export const mobileI18n = new I18n({ en, ar });
mobileI18n.enableFallback = true;
mobileI18n.defaultLocale = "en";
mobileI18n.locale = "en";

export function translate(
  scope: string,
  options?: Record<string, string | number>
): string {
  return mobileI18n.t(scope, options);
}
