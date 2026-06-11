import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { parseBearerToken } from "@/lib/auth/parse-bearer-token";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type ApiAuthMode = "cookie" | "bearer";

export interface ApiSupabaseClient {
  supabase: SupabaseClient;
  authMode: ApiAuthMode;
}

/**
 * Resolves a Supabase client for API routes and server actions that must support
 * both Next.js SSR cookie sessions (web) and Authorization Bearer tokens (mobile).
 */
export async function createApiClient(): Promise<ApiSupabaseClient> {
  const headerStore = await headers();
  const bearer = parseBearerToken(headerStore.get("authorization"));

  if (bearer) {
    const env = getSupabaseEnv();
    if (!env) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) in .env.local"
      );
    }

    const supabase = createSupabaseJsClient(env.url, env.publicKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      },
    });

    return { supabase, authMode: "bearer" };
  }

  return {
    supabase: await createCookieClient(),
    authMode: "cookie",
  };
}
