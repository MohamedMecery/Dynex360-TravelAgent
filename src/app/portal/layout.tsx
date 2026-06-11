"use client";

import { usePathname } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";

const AUTH_PATHS = new Set([
  "/portal/login",
  "/portal/forgot-password",
  "/portal/reset-password",
]);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (AUTH_PATHS.has(pathname)) {
    return <>{children}</>;
  }
  return <PortalShell>{children}</PortalShell>;
}
