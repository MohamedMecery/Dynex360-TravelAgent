import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publicKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message:
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    });
  }

  try {
    const healthUrl = `${url.replace(/\/$/, "")}/auth/v1/health`;
    const res = await fetch(healthUrl, {
      headers: { apikey: publicKey },
      cache: "no-store",
    });

    return NextResponse.json({
      ok: res.ok,
      configured: true,
      host: new URL(url).host,
      isLocal: url.includes("127.0.0.1") || url.includes("localhost"),
      status: res.status,
      message: res.ok
        ? "Supabase is reachable"
        : `Supabase returned HTTP ${res.status}`,
    });
  } catch {
    const isLocal = url.includes("127.0.0.1") || url.includes("localhost");
    return NextResponse.json({
      ok: false,
      configured: true,
      host: new URL(url).host,
      isLocal,
      message: isLocal
        ? "Local Supabase is not running. Start Docker Desktop, then run: npx supabase start"
        : "Cannot reach Supabase. Check your project URL and network.",
    });
  }
}
