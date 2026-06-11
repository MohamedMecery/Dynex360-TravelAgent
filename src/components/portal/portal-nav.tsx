"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Plane,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PortalUnreadBadge } from "@/components/portal/portal-unread-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/lib/supabase/client";

type PortalNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: boolean;
};

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/portal", labelKey: "portal.nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/quotations", labelKey: "portal.nav.quotations", icon: FileText },
  { href: "/portal/bookings", labelKey: "portal.nav.bookings", icon: Plane },
  { href: "/portal/notifications", labelKey: "portal.nav.notifications", icon: Bell, badge: true },
  { href: "/portal/profile", labelKey: "portal.nav.profile", icon: User },
  { href: "/portal/preferences", labelKey: "portal.nav.preferences", icon: Settings },
];

export function PortalNav() {
  const pathname = usePathname();
  const { t, dir } = useTranslation();

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    window.location.assign("/portal/login");
  };

  return (
    <header dir={dir} className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="font-semibold text-primary">
            {t("portal.title")}
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, labelKey, icon: Icon, exact, badge }) => {
              const active = exact === true ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                  {badge ? <PortalUnreadBadge /> : null}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-red-600 hover:underline"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.logout")}</span>
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 sm:hidden">
        {NAV_ITEMS.map(({ href, labelKey, exact, badge }) => {
          const active = exact === true ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {t(labelKey)}
              {badge ? <PortalUnreadBadge /> : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
