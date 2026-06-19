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
  | "followup_clicked";

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
