// Follow-up цепочка (REDESIGN §9): почта + Telegram, дни 2/4/7, у каждого касания
// своя работа, стоп при ответе (engaged). Крон в воркере раз в час.
// followup_stage: 0 — касание 0 (подарок); 1 — день2; 2 — день4; 3 — день7 (финал).
import { getSupabase } from "./supabase";
import { env } from "./env";
import { config } from "./config";
import { sendEmail } from "./unisender";
import { sendTelegramMessage } from "./telegram";
import { followupEmail } from "./email-templates";
import { reportUrl } from "./delivery";

const OWNER_CONTACT = env.NEXT_PUBLIC_OWNER_CONTACT;
const BATCH = 50;

interface DueLead {
  id: string;
  audit_id: string | null;
  email: string | null;
  followup_stage: number;
}

// Текст для Telegram (человек уже в чате, живо). Тон — docs/VOICE.md.
export function botText(touch: 1 | 2 | 3, p: { reportUrl: string; finding: string | null }): string {
  if (touch === 1) {
    const start = p.finding
      ? `на вашем месте я бы начала вот с чего: ${p.finding}.`
      : `на вашем месте начала бы с первого экрана и прямого пути к заявке. Там обычно утекает больше всего.`;
    return (
      `Заглянули в разбор?\n\n` +
      `Если честно, ${start}\n` +
      `Это то, что прямо сейчас тихо съедает заявки — человек заходит, не находит ответа и уходит.\n\n` +
      `Остальное по порядку в разборе: ${p.reportUrl}`
    );
  }
  if (touch === 2) {
    const weak = p.finding ? `\n\nУ вас по разбору проседает ${p.finding} — и дело не в мелкой правке, а в том, как собрана страница.` : "";
    return (
      `Чем сайт, который приносит заявки, отличается от просто красивого?\n\n` +
      `Не дизайном. Устройством: на первом экране сразу ясно, что это и для кого; к заявке ведёт один очевидный шаг; рядом с кнопкой — доверие.\n\n` +
      `Дело почти никогда не в одной кнопке.${weak}\nРазбор: ${p.reportUrl}`
    );
  }
  return (
    `Давайте я гляну ваш сайт лично?\n\n` +
    `Пройдусь по страницам, покажу, что чинить первым, и соберу короткий план под вас. 20 минут, бесплатно, без обязательств.\n\n` +
    `Бывает, что правок набирается столько, что проще пересобрать страницу заново, чем чинить по частям. На созвоне посмотрим, что нужно именно вам.\n\n` +
    `Если интересно — напишите сюда 🙌`
  );
}

async function logFollowup(leadId: string, channel: "email" | "telegram", status: string): Promise<void> {
  try {
    await getSupabase().from("emails_log").insert({ lead_id: leadId, channel, type: "followup", status });
  } catch (e) {
    console.error("[followup] лог не записан:", e);
  }
}

async function tgChatId(leadId: string): Promise<number | string | null> {
  const { data } = await getSupabase()
    .from("events")
    .select("meta")
    .eq("lead_id", leadId)
    .eq("step", "tg_started")
    .order("created_at", { ascending: false })
    .limit(1);
  const meta = data?.[0]?.meta as { chat_id?: number | string } | null;
  return meta?.chat_id ?? null;
}

async function topPrioritiesFor(auditId: string): Promise<string[]> {
  const { data } = await getSupabase().from("audits").select("result").eq("id", auditId).single();
  return (data?.result as { top_priorities?: string[] } | null)?.top_priorities ?? [];
}

export async function followupTick(): Promise<void> {
  for (const touch of [1, 2, 3] as const) {
    const fromStage = touch - 1;
    const minAgeDays = config.followupDays[touch];
    const cutoff = new Date(Date.now() - minAgeDays * 86_400_000).toISOString();

    const { data, error } = await getSupabase()
      .from("leads")
      .select("id, audit_id, email, followup_stage")
      .eq("followup_stage", fromStage)
      .eq("status", "new") // engaged/replied/client — цепочку не продолжаем (§9)
      .eq("consent", true)
      .lte("created_at", cutoff)
      .limit(BATCH);

    if (error) {
      console.error("[followup] выборка не удалась:", error);
      continue;
    }

    for (const lead of (data ?? []) as DueLead[]) {
      if (!lead.audit_id) continue;
      const link = reportUrl(lead.audit_id);
      // касание 1 → топ-1 находка, касание 2 → топ-2 (docs/VOICE.md)
      const tp = await topPrioritiesFor(lead.audit_id);
      const finding = touch === 1 ? (tp[0] ?? null) : touch === 2 ? (tp[1] ?? null) : null;
      const chatId = await tgChatId(lead.id);

      let realAttempt = false;
      const hasChannel = !!lead.email || chatId != null;

      // почта
      if (lead.email) {
        const { subject, html } = followupEmail(touch, { reportUrl: link, ownerContact: OWNER_CONTACT, finding });
        const res = await sendEmail({ to: lead.email, subject, html, metadata: { lead_id: lead.id } });
        await logFollowup(lead.id, "email", res.ok ? "sent" : res.skipped ? "skipped" : "failed");
        if (!res.skipped) realAttempt = true;
      }

      // Telegram (если пришёл через бота — есть chat_id). Текст другой, не дубль письма.
      if (chatId != null) {
        const res = await sendTelegramMessage(chatId, botText(touch, { reportUrl: link, finding }));
        await logFollowup(lead.id, "telegram", res.ok ? "sent" : res.skipped ? "skipped" : "failed");
        if (!res.skipped) realAttempt = true;
      }

      // двигаем стадию, если была реальная попытка ИЛИ слать вообще некуда;
      // если каналы есть, но транспорт не настроен (skipped) — оставляем, отправим позже.
      if (realAttempt || !hasChannel) {
        await getSupabase().from("leads").update({ followup_stage: touch }).eq("id", lead.id);
      }
    }
  }
}
