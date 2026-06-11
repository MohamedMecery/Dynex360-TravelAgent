import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWhatsAppAdapter, isWhatsAppMockMode } from "@/lib/whatsapp/provider-factory";
import { WhatsAppWebhookStatusService } from "@/lib/whatsapp/webhook-status-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() ??
    process.env.WHATSAPP_META_WEBHOOK_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    challenge &&
    (isWhatsAppMockMode() || (expectedToken && token === expectedToken))
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Webhook verification failed" } },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const adapter = createWhatsAppAdapter("meta_cloud");
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const signatureValid =
    isWhatsAppMockMode() || adapter.verifyWebhook(rawBody, headers);

  if (!signatureValid) {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
      { status: 401 }
    );
  }

  const events = adapter.normalizeStatusEvent(payload);
  if (events.length === 0) {
    return NextResponse.json({ data: { applied: 0, status: "ignored" } });
  }

  try {
    const service = new WhatsAppWebhookStatusService(createAdminClient());
    const applied = await service.applyStatusEvents(events);
    return NextResponse.json({ data: { applied, status: "ok" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
