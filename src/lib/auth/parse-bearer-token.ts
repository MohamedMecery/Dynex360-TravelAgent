/**
 * Extracts a Supabase access token from an Authorization header.
 * Accepts: `Bearer <token>` (case-insensitive scheme).
 */
export function parseBearerToken(
  authorizationHeader: string | null | undefined
): string | null {
  if (!authorizationHeader?.trim()) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  const token = match?.[1]?.trim();
  return token || null;
}
