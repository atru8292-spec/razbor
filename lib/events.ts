// Логирование событий продуктовой воронки в таблицу events (раздел 3/14 ТЗ).
// Пишем с первого дня. Мягко: сбой логирования НИКОГДА не валит запрос.
import { getSupabase } from "./supabase";

export type EventStep =
  | "landed"
  | "url_entered"
  | "audit_started"
  | "teaser_shown"
  | "contact_opened"
  | "contact_submitted"
  | "contact_abandoned"
  | "report_viewed"
  | "pdf_downloaded"
  | "followup_clicked"
  | "tg_started" // пользователь открыл бота по диплинку (храним chat_id в meta)
  | "bot_message" // сообщение в боте (meta.dir in|out, meta.text) — переписка в карточке лида
  | "admin_analysis"; // кэш AI-разбора статистики в /admin (meta.text, cost_cents, period)

export async function logEvent(
  step: EventStep,
  opts: { auditId?: string | null; leadId?: string | null; meta?: Record<string, unknown> | null } = {},
): Promise<void> {
  try {
    await getSupabase().from("events").insert({
      step,
      audit_id: opts.auditId ?? null,
      lead_id: opts.leadId ?? null,
      meta: opts.meta ?? null,
    });
  } catch (e) {
    console.error(`[events] не удалось записать ${step}:`, e);
  }
}

// Сообщение бота (часть H): входящее (dir='in', от человека) или исходящее
// (dir='out', касание бота). Лента строится в карточке лида по lead_id + времени.
// Мягко: сбой логирования не валит работу бота.
export async function logBotMessage(
  leadId: string | null,
  dir: "in" | "out",
  text: string,
  chatId?: number | string | null,
  auto?: boolean, // касание ушло по расписанию (для пометки «авто» в карточке, BOT.md ч.2)
): Promise<void> {
  try {
    await getSupabase()
      .from("events")
      .insert({
        step: "bot_message",
        lead_id: leadId,
        meta: { dir, text, ...(chatId != null ? { chat_id: chatId } : {}), ...(auto ? { auto: true } : {}) },
      });
  } catch (e) {
    console.error("[events] не удалось записать bot_message:", e);
  }
}
