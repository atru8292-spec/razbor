import { NextRequest, NextResponse } from "next/server";
import { eventSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/limit";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";

// POST /api/events — приём событий воронки от клиента. Всегда отвечаем ok (best-effort).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  try {
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (parsed.success) {
      const meta = { ...(parsed.data.meta ?? {}), ip };
      await logEvent(parsed.data.step, { auditId: parsed.data.auditId ?? null, meta });
    }
  } catch {
    // глотаем — аналитика не должна влиять на пользователя
  }
  return NextResponse.json({ ok: true });
}
