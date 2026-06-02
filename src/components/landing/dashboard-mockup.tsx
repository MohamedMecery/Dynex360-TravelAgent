"use client";

import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";
import { useTranslation } from "@/i18n/locale-provider";

interface DashboardMockupProps {
  className?: string;
  compact?: boolean;
}

export function DashboardMockup({ className, compact = false }: DashboardMockupProps) {
  const { t, isRtl } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), active: true },
    { icon: Users, label: t("nav.customers") },
    { icon: Package, label: t("nav.packages") },
    { icon: CalendarCheck, label: t("nav.bookings") },
    { icon: CreditCard, label: t("nav.payments") },
  ];

  const stats = [
    { label: t("landing.mockup.statConfirmed"), value: "24", tone: "text-emerald-600" },
    { label: t("landing.mockup.statRevenue"), value: "SAR 186K", tone: "text-landing-teal" },
    { label: t("landing.mockup.statOutstanding"), value: "SAR 12.4K", tone: "text-amber-600" },
  ];

  const rows = [
    { ref: "BK-2026-0142", status: t("bookingStatus.confirmed"), amount: "SAR 4,200" },
    { ref: "BK-2026-0138", status: t("bookingStatus.draft"), amount: "SAR 8,950" },
    { ref: "BK-2026-0131", status: t("bookingStatus.completed"), amount: "SAR 2,100" },
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-landing",
        compact ? "text-[10px]" : "text-xs",
        className
      )}
      role="img"
      aria-label={t("landing.mockup.ariaLabel")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-landing-teal via-landing-gold to-landing-ocean" />
      <div className={cn("flex", isRtl && "flex-row-reverse")}>
        <aside
          className={cn(
            "hidden w-[28%] shrink-0 border-landing-sand bg-landing-sand/80 sm:block",
            isRtl ? "border-s" : "border-e"
          )}
        >
          <div className="border-b border-border/60 px-3 py-3">
            <p className="font-bold text-landing-deep">TravelOS</p>
            <p className="text-[9px] text-muted-foreground">{t("app.tagline")}</p>
          </div>
          <nav className="space-y-0.5 p-2">
            {navItems.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5",
                  isRtl && "flex-row-reverse",
                  active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 bg-white">
          <div
            className={cn(
              "flex items-center justify-between border-b border-border/60 px-3 py-2",
              isRtl && "flex-row-reverse"
            )}
          >
            <p className={cn("font-semibold text-foreground", compact ? "text-[11px]" : "text-sm")}>
              {t("dashboard.title")}
            </p>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-800">
              {t("landing.mockup.live")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-muted/30 p-2">
                <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                <p className={cn("font-bold", stat.tone, compact ? "text-sm" : "text-base")}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-3 pb-3">
            <p className="mb-1.5 text-[9px] font-medium text-muted-foreground">
              {t("dashboard.recentBookings")}
            </p>
            <table className="w-full">
              <thead>
                <tr className={cn("text-[9px] text-muted-foreground", isRtl ? "text-right" : "text-left")}>
                  <th className="pb-1 font-medium">{t("dashboard.reference")}</th>
                  <th className="pb-1 font-medium">{t("dashboard.status")}</th>
                  <th className={cn("pb-1 font-medium", isRtl ? "text-left" : "text-right")}>
                    {t("dashboard.total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.ref} className="border-t border-border/40">
                    <td className="py-1 font-mono text-[9px]">{row.ref}</td>
                    <td className="py-1">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] text-primary">
                        {row.status}
                      </span>
                    </td>
                    <td className={cn("py-1 font-medium", isRtl ? "text-left" : "text-right")}>
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
