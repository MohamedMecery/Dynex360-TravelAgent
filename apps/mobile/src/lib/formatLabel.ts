import { translate } from "@/i18n/instance";

/** Localized enum/status label (falls back to title case). */
export function formatLabel(value: string): string {
  const key = `enum.${value}`;
  const translated = translate(key);
  if (translated && translated !== key) {
    return translated;
  }
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
