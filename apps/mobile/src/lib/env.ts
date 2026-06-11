export function getSupabaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL is not set");
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY is not set");
  }
  return key;
}

export function getApiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
  return base.replace(/\/$/, "");
}
