import { NextRequest, NextResponse } from "next/server";
import { auditRequestSchema, normalizeUrl } from "@/lib/validation";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp, checkAuditStartAllowed } from "@/lib/limit";
import { logEvent } from "@/lib/events";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

// POST /api/audit — запуск аудита (Flow B: без контакта). Turnstile + лимиты + создание pending.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const parsed = auditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте ссылку и пройдите проверку." }, { status: 400 });
  }

  const url = normalizeUrl(parsed.data.url);
  if (!url) {
    return NextResponse.json({ error: "Не похоже на корректную ссылку сайта." }, { status: 400 });
  }

  const human = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!human) {
    return NextResponse.json({ error: "Не прошла проверка, что вы не робот." }, { status: 400 });
  }

  const limit = await checkAuditStartAllowed(ip);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.reason }, { status: 429 });
  }

  const goal = parsed.data.goal?.trim() || null;
  const { data, error } = await getSupabase()
    .from("audits")
    .insert({ url, goal, status: "pending" })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[api/audit] не удалось создать аудит:", error);
    return NextResponse.json({ error: "Не удалось создать проверку. Попробуйте ещё раз." }, { status: 500 });
  }

  const rid = req.cookies.get("rid")?.value;
  const isOwner = req.cookies.get("is_owner")?.value === "1";
  await logEvent("audit_started", {
    auditId: data.id,
    meta: { ip, url, goal, ...(rid ? { session_id: rid } : {}), ...(isOwner ? { is_owner: true } : {}) },
  });
  return NextResponse.json({ auditId: data.id });
}
