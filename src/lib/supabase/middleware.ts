import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createMiddlewareClient(
  request: NextRequest,
  initialResponse?: NextResponse
): {
  supabase: ReturnType<typeof createServerClient>;
  response: NextResponse;
} {
  const env = getSupabaseEnv();
  if (!env) {
    return {
      supabase: null as unknown as ReturnType<typeof createServerClient>,
      response: initialResponse ?? NextResponse.next({ request }),
    };
  }

  let response = initialResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previous = response;
        response = NextResponse.next({ request });
        previous.cookies.getAll().forEach((cookie) => {
          response.cookies.set(cookie);
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response };
}
