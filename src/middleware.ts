import { NextResponse, type NextRequest } from "next/server";
import { applyRequestLocale } from "@/i18n/apply-request-locale";
import {
  accountStatusLoginReason,
  isActiveUserStatus,
} from "@/lib/auth/account-status";
import { resolveDbUserAccess } from "@/lib/auth/resolve-db-user-access";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { UserStatus } from "@/types";

const PUBLIC_PATHS = new Set([
  "/",
  "/home",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
]);

const AUTH_CALLBACK_PREFIX = "/auth/";

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith(AUTH_CALLBACK_PREFIX)) return true;
  if (pathname.startsWith("/api/health/")) return true;
  return false;
}

function isAuthRecoveryPath(pathname: string): boolean {
  return pathname === "/reset-password" || pathname === "/onboarding";
}

function copyCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function middleware(request: NextRequest) {
  // Set X-NEXT-INTL-LOCALE from cookie — no path rewrites (/login not /en/login).
  const localeResponse = applyRequestLocale(request);

  if (!isSupabaseConfigured()) {
    return localeResponse;
  }

  const { supabase, response } = createMiddlewareClient(request, localeResponse);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  let profileStatus: UserStatus | null = null;
  if (user) {
    const access = await resolveDbUserAccess(supabase, user.id);
    profileStatus = access?.status ?? null;
  }

  const accountActive = Boolean(profileStatus && isActiveUserStatus(profileStatus));

  if (user && accountActive && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === "/onboarding") {
    if (profileStatus !== "pending") {
      const url = request.nextUrl.clone();
      url.pathname = profileStatus === "active" ? "/dashboard" : "/login";
      if (profileStatus !== "active") {
        url.searchParams.set(
          "reason",
          accountStatusLoginReason(profileStatus ?? undefined)
        );
      }
      const redirectResponse = NextResponse.redirect(url);
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }
    return response;
  }

  if (user && pathname === "/reset-password") {
    return response;
  }

  if (user && !accountActive && !isPublicPath(pathname) && !isAuthRecoveryPath(pathname)) {
    const url = request.nextUrl.clone();
    if (profileStatus === "pending") {
      url.pathname = "/onboarding";
    } else {
      await supabase.auth.signOut();
      url.pathname = "/login";
      url.searchParams.set("reason", accountStatusLoginReason(profileStatus ?? undefined));
    }
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("to", pathname);
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
