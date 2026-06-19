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

// Текст для Telegram (человек уже в чате — без ссылок-кнопок, живо).
function botText(touch: 1 | 2 | 3, p: { reportUrl: string; topPriority: string | null }): string {
  if (touch === 1) {
    const main = p.topPriority
      ? `главное в вашем случае это: ${p.topPriority}. С него бы и начала.`
      : `больше всего заявок обычно вытягивает первый экран и прямой путь к заявке.`;
    return `Посмотрели разбор? Если коротко — ${main}\nОстальное — по приоритету в разборе: ${p.reportUrl}`;
  }
  if (touch === 2) {
    return (
      `Как выглядит сайт, который не теряет заявки: понятный первый экран (что это, для кого, сколько стоит), ` +
      `один очевидный шаг к заявке и доверие рядом с кнопкой. Когда это на месте — посетитель не уходит «подумать».\n` +
      `Ваш разбор всегда здесь: ${p.reportUrl}`
    );
  }
  return (
    `Хотите, лично пройдусь по вашему сайту и соберу план правок под вас? Это 20 минут и бесплатно — ` +
    `разберём, что починить первым. Напишите сюда, договоримся 🙌`
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

async function topPriorityFor(auditId: string): Promise<string | null> {
  const { data } = await getSupabase().from("audits").select("result").eq("id", auditId).single();
  const tp = (data?.result as { top_priorities?: string[] } | null)?.top_priorities;
  return tp?.[0] ?? null;
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
      const topPriority = await topPriorityFor(lead.audit_id);
      const chatId = await tgChatId(lead.id);

      let realAttempt = false;
      const hasChannel = !!lead.email || chatId != null;

      // почта
      if (lead.email) {
        const { subject, html } = followupEmail(touch, { reportUrl: link, ownerContact: OWNER_CONTACT, topPriority });
        const res = await sendEmail({ to: lead.email, subject, html, metadata: { lead_id: lead.id } });
        await logFollowup(lead.id, "email", res.ok ? "sent" : res.skipped ? "skipped" : "failed");
        if (!res.skipped) realAttempt = true;
      }

      // Telegram (если пришёл через бота — есть chat_id). Текст другой, не дубль письма.
      if (chatId != null) {
        const res = await sendTelegramMessage(chatId, botText(touch, { reportUrl: link, topPriority }));
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
