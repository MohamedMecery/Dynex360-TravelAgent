"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface PortalAuthShellProps {
  children: React.ReactNode;
}

export function PortalAuthShell({ children }: PortalAuthShellProps) {
  const { t, isRtl } = useTranslation();

  return (
    <div className={cn("min-h-screen bg-muted/30 px-6 py-10", isRtl && "rtl")}>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground">
            {t("landing.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">{t("portal.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("portal.subtitle")}</p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("portal.staffPrompt")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
