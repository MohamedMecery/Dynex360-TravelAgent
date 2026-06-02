/** Supabase public key: supports new publishable key or legacy anon key. */
export function getSupabasePublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    null
  );
}

export function getSupabaseEnv(): { url: string; publicKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = getSupabasePublicKey();

  if (!url || !publicKey) {
    return null;
  }

  return { url, publicKey };
}

/** @deprecated Use publicKey from getSupabaseEnv — kept for callers expecting anonKey. */
export function getSupabaseAnonKey(): string | null {
  return getSupabasePublicKey();
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
