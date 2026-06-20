import { NextRequest, NextResponse } from "next/server";
import { leadRequestSchema } from "@/lib/validation";
import { isContactRateLimited, getClientIp } from "@/lib/limit";
import { logEvent } from "@/lib/events";
import { getSupabase } from "@/lib/supabase";
import { deliverGift } from "@/lib/delivery";

export const runtime = "nodejs";

// POST /api/lead — контакт открывает полный разбор (Flow B). Лимит один на контакт в месяц.
// Доставка подарка/бот — Шаг 6.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const parsed = leadRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Проверьте поля формы.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sb = getSupabase();

  // аудит должен существовать
  const { data: audit } = await sb
    .from("audits")
    .select("id, status")
    .eq("id", parsed.data.auditId)
    .single();
  if (!audit) {
    return NextResponse.json({ error: "Проверка не найдена." }, { status: 404 });
  }

  // Короткий гейт (GATE.md): одно поле — почта. Telegram добавится автоматом в боте.
  const email = parsed.data.email.trim().toLowerCase();
  const contact = { phone: null, telegram: null, email, channel: "email" as const };

  if (await isContactRateLimited(contact)) {
    return NextResponse.json(
      { error: "Вы уже проверяли сайт в этом месяце. Напишите мне для разбора — контакт в отчёте." },
      { status: 429 },
    );
  }

  const { data: lead, error } = await sb
    .from("leads")
    .insert({
      audit_id: audit.id,
      phone: contact.phone,
      telegram: contact.telegram,
      email: contact.email,
      channel: contact.channel,
      consent: true,
      consent_at: new Date().toISOString(),
      ip,
      source: req.cookies.get("utm")?.value || "direct", // источник трафика (часть G)
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("[api/lead] не удалось создать лид:", error);
    return NextResponse.json({ error: "Не удалось сохранить контакт. Попробуйте ещё раз." }, { status: 500 });
  }

  const rid = req.cookies.get("rid")?.value;
  const isOwner = req.cookies.get("is_owner")?.value === "1";
  await logEvent("contact_submitted", {
    auditId: audit.id,
    leadId: lead.id,
    meta: { ip, channel: contact.channel, ...(rid ? { session_id: rid } : {}), ...(isOwner ? { is_owner: true } : {}) },
  });

  // Немедленная доставка подарка/отчёта (почта+СМС) — best-effort, не валит ответ.
  try {
    await deliverGift({
      id: lead.id,
      audit_id: audit.id,
      phone: contact.phone,
      telegram: contact.telegram,
      email: contact.email,
    });
  } catch (e) {
    console.error("[api/lead] доставка не удалась:", e);
  }

  return NextResponse.json({ ok: true });
}
