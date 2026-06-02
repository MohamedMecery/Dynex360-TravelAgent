import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/auth/site-url";

function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const siteUrl = getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const authError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (authError) {
    const reason =
      errorDescription?.toLowerCase().includes("expired") ||
      authError.toLowerCase().includes("expired")
        ? "link_expired"
        : "auth_callback_error";
    return NextResponse.redirect(`${siteUrl}/login?reason=${reason}`);
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?reason=auth_callback_error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const reason = error.message.toLowerCase().includes("expired")
      ? "link_expired"
      : "auth_callback_error";
    return NextResponse.redirect(`${siteUrl}/login?reason=${reason}`);
  }

  return NextResponse.redirect(`${siteUrl}${next}`);
}
