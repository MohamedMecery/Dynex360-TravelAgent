import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getEventDispatchWorker } from "@/lib/events/event-dispatch-worker";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return secretsMatch(auth.slice(7).trim(), secret);
  }

  const header = request.headers.get("x-cron-secret");
  return header ? secretsMatch(header.trim(), secret) : false;
}

async function runWorker(batchSize: number) {
  try {
    const worker = getEventDispatchWorker();
    const result = await worker.processBatch({ batchSize });
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker failed";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}

/** Sprint 8D — poll and process pending event dispatch jobs. */
export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  let batchSize = 20;
  try {
    const body = (await request.json().catch(() => ({}))) as { batchSize?: number };
    if (typeof body.batchSize === "number" && body.batchSize > 0) {
      batchSize = Math.min(body.batchSize, 100);
    }
  } catch {
    /* empty body ok */
  }

  return runWorker(batchSize);
}

/** Vercel Cron invokes scheduled paths with GET + Authorization: Bearer CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }
  return runWorker(20);
}
