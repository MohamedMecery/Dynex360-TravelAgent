import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";

export type EmailLocale = "en" | "ar";

type EmailMessages = Record<string, string | Record<string, string>>;

const CATALOG: Record<EmailLocale, EmailMessages> = {
  en: en.email as EmailMessages,
  ar: ar.email as EmailMessages,
};

export function resolveEmailLocale(value: string | null | undefined): EmailLocale {
  if (value?.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}

function getNested(messages: EmailMessages, key: string): string | undefined {
  const parts = key.split(".");
  let current: string | EmailMessages | undefined = messages;
  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function emailT(
  locale: EmailLocale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const template = getNested(CATALOG[locale], key) ?? getNested(CATALOG.en, key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name];
    return value !== undefined ? String(value) : `{${name}}`;
  });
}
