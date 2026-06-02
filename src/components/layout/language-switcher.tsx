"use client";

import { useLocale } from "next-intl";
import { useRouter as useNextRouter } from "next/navigation";
import { LanguageSwitcherBase } from "@/components/layout/language-switcher-base";
import { LOCALES, type Locale } from "@/i18n/config";
import { useTranslation } from "@/i18n/locale-provider";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher(props: { className?: string; showLabel?: boolean }) {
  const locale = useLocale() as Locale;
  const { t } = useTranslation();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const pathname = usePathname();

  return (
    <LanguageSwitcherBase
      {...props}
      locale={locale}
      locales={[...LOCALES]}
      label={t("common.language")}
      getOptionLabel={(code: Locale) => t(`common.${code === "en" ? "english" : "arabic"}`)}
      onSelect={(next: Locale) => {
        if (next !== locale) {
          router.replace(pathname, { locale: next });
          nextRouter.refresh();
        }
      }}
    />
  );
}
