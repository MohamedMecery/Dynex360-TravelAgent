"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout, useGetIdentity, useCan } from "@refinedev/core";
import { resources } from "@/providers/resources";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";

function NavResourceLink({
  resource,
  href,
  label,
  icon,
  isActive,
}: {
  resource: string;
  href: string;
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
}) {
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canAccess } = useCan({
    resource,
    action: "list",
    params: { role: identity?.role },
  });

  if (canAccess?.can === false) return null;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<{ name: string; email: string }>();
  const { t, dir } = useTranslation();

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/auth/");

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div dir={dir} className="flex min-h-screen">
      <aside className="w-64 border-e bg-muted/30 p-4 flex flex-col shrink-0">
        <div className="mb-6">
          <Link href="/home" className="block rounded-md transition-opacity hover:opacity-90">
            <h1 className="text-xl font-bold text-primary">{t("app.name")}</h1>
            <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
          </Link>
          <Link
            href="/home"
            className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.home")}
          </Link>
          <LanguageSwitcher className="mt-3" />
        </div>
        <nav className="flex-1 space-y-1">
          {resources.map((resource) => {
            const href = resource.list as string;
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const labelKey = resource.meta?.labelKey as string | undefined;
            const label = labelKey ? t(labelKey) : (resource.meta?.label as string);
            if (
              resource.name === "users" ||
              resource.name === "settings" ||
              resource.name === "audit_logs" ||
              resource.name === "ai-conversations"
            ) {
              return (
                <NavResourceLink
                  key={resource.name}
                  resource={resource.name}
                  href={href}
                  label={label}
                  icon={resource.meta?.icon}
                  isActive={isActive}
                />
              );
            }
            return (
              <Link
                key={resource.name}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {resource.meta?.icon}
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium truncate">{identity?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{identity?.email}</p>
          <button
            onClick={() => logout()}
            className="mt-2 text-xs text-red-600 hover:underline"
          >
            {t("common.logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
