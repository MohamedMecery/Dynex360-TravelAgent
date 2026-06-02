import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ActiveAccountContext,
  validateActiveAccountAccess,
} from "@/lib/auth/validate-active-account";

export type { ActiveAccountContext };

export interface ActiveApiContext extends ActiveAccountContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Authenticated + active account + JWT/DB consistency for API routes.
 */
export async function requireActiveApiAccess(): Promise<
  ActiveApiContext | NextResponse
> {
  const supabase = await createClient();
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

  return { ...gate, supabase };
}
