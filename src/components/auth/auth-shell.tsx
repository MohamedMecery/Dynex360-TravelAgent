"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { CalendarCheck, CreditCard, Package, Users } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  backHref?: string;
  backLabelKey?: string;
}

export function AuthShell({ children, backHref = "/home", backLabelKey = "landing.backHome" }: AuthShellProps) {
  const { t, isRtl } = useTranslation();
  const backArrow = isRtl ? "→" : "←";

  const features = [
    { icon: Users, labelKey: "landing.featureCustomers" },
    { icon: Package, labelKey: "landing.featurePackages" },
    { icon: CalendarCheck, labelKey: "landing.featureBookings" },
    { icon: CreditCard, labelKey: "landing.featurePayments" },
  ] as const;

  return (
    <div className={cn("min-h-screen grid lg:grid-cols-2", isRtl && "lg:[direction:rtl]")}>
      <section className="relative hidden overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-800 opacity-95" />
        <div className="relative z-10">
          <Link href="/home" className="text-2xl font-bold tracking-tight">
            {t("app.name")}
          </Link>
          <p className="mt-2 max-w-sm text-sm text-primary-foreground/85">{t("landing.heroSubtitle")}</p>
        </div>
        <ul className="relative z-10 space-y-4">
          {features.map(({ icon: Icon, labelKey }) => (
            <li key={labelKey} className={cn("flex items-center gap-3 text-sm", isRtl && "flex-row-reverse")}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                <Icon className="h-4 w-4" />
              </span>
              {t(labelKey)}
            </li>
          ))}
        </ul>
        <p className="relative z-10 text-xs text-primary-foreground/70">{t("landing.footer.copyright")}</p>
      </section>

      <section className="flex flex-col justify-center bg-muted/30 px-6 py-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground lg:hidden">
              {backArrow} {t(backLabelKey)}
            </Link>
            <LanguageSwitcher />
          </div>
          <div className="mb-6 lg:hidden">
            <h1 className="text-2xl font-bold text-primary">{t("app.name")}</h1>
            <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
