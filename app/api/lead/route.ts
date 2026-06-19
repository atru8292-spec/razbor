import { NextRequest, NextResponse } from "next/server";
import { leadRequestSchema } from "@/lib/validation";
import { normalizeContact, isContactRateLimited, getClientIp } from "@/lib/limit";
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

  const contact = normalizeContact(parsed.data.contact, parsed.data.email || null);
  if (!contact.phone && !contact.telegram && !contact.email) {
    return NextResponse.json({ error: "Укажите телефон или телеграм." }, { status: 400 });
  }

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
      source: "web",
    })
    .select("id")
    .single();

  if (error || !lead) {
    console.error("[api/lead] не удалось создать лид:", error);
    return NextResponse.json({ error: "Не удалось сохранить контакт. Попробуйте ещё раз." }, { status: 500 });
  }

  await logEvent("contact_submitted", { auditId: audit.id, leadId: lead.id, meta: { ip, channel: contact.channel } });

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
