import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ActiveAccountContext,
  validateActiveAccountAccess,
} from "@/lib/auth/validate-active-account";
import { createApiClient, type ApiAuthMode } from "@/lib/supabase/api-client";

export type { ActiveAccountContext };

export interface ActiveApiContext extends ActiveAccountContext {
  supabase: SupabaseClient;
  authMode: ApiAuthMode;
}

/**
 * Authenticated + active account + JWT/DB consistency for API routes.
 * Supports SSR cookies (web) and Authorization: Bearer (mobile).
 */
export async function requireActiveApiAccess(): Promise<
  ActiveApiContext | NextResponse
> {
  const { supabase, authMode } = await createApiClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const gate = await validateActiveAccountAccess(supabase, user);
  if (gate instanceof NextResponse) {
    return gate;
  }

  return { ...gate, supabase, authMode };
}
