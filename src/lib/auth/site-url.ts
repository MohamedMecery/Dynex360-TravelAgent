/** Canonical app origin for Supabase Auth redirect URLs (server or NEXT_PUBLIC). */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** Build /auth/callback with optional next path (must start with /). */
export function getAuthCallbackUrl(nextPath: string): string {
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  const base = getSiteUrl();
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
