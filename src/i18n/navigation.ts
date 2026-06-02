import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Locale-aware navigation helpers.
 * With localePrefix: "never", paths stay the same; locale is stored in cookie.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
