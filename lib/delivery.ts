// Оркестратор доставки подарка/отчёта (раздел 11 ТЗ). Best-effort, логирует emails_log,
// без дублей. Каналы: почта (Unisender Go) и СМС здесь; Telegram — бот по диплинку.
import { getSupabase } from "./supabase";
import { env } from "./env";
import { sendEmail } from "./unisender";
import { sendSms } from "./sms";
import { giftEmail } from "./email-templates";

export interface LeadForDelivery {
  id: string;
  audit_id: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
}

export function giftUrl(): string {
  return env.GIFT_URL || `${env.APP_BASE_URL}/gift/checklist.pdf`;
}

export function reportUrl(auditId: string): string {
  return `${env.APP_BASE_URL}/a/${auditId}`;
}

/** Диплинк: бот по этому токену (= lead.id) найдёт лид и отдаст подарок. */
export function telegramDeeplink(leadId: string): string {
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${leadId}`;
}

type Channel = "telegram" | "sms" | "email";
type LogType = "gift" | "report" | "followup";

async function alreadySent(leadId: string, channel: Channel, type: LogType): Promise<boolean> {
  const { data } = await getSupabase()
    .from("emails_log")
    .select("id")
    .eq("lead_id", leadId)
    .eq("channel", channel)
    .eq("type", type)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function logDelivery(
  leadId: string,
  channel: Channel,
  type: LogType,
  status: string,
): Promise<void> {
  try {
    await getSupabase().from("emails_log").insert({ lead_id: leadId, channel, type, status });
  } catch (e) {
    console.error("[delivery] не удалось записать emails_log:", e);
  }
}

/** Немедленная доставка подарка+отчёта почтой и СМС. Telegram — отдельно, ботом. */
export async function deliverGift(lead: LeadForDelivery): Promise<void> {
  if (!lead.audit_id) return;
  const links = { reportUrl: reportUrl(lead.audit_id), giftUrl: giftUrl() };

  // почта
  if (lead.email && !(await alreadySent(lead.id, "email", "gift"))) {
    const { subject, html } = giftEmail(links);
    const res = await sendEmail({ to: lead.email, subject, html, metadata: { lead_id: lead.id } });
    await logDelivery(lead.id, "email", "gift", res.ok ? "sent" : res.skipped ? "skipped" : "failed");
    if (!res.ok && !res.skipped) console.error("[delivery] email:", res.error);
  }

  // СМС
  if (lead.phone && !(await alreadySent(lead.id, "sms", "gift"))) {
    const text = `RAZBOR: ваш разбор и подарок — ${links.reportUrl}`;
    const res = await sendSms({ to: lead.phone, text });
    await logDelivery(lead.id, "sms", "gift", res.ok ? "sent" : res.skipped ? "skipped" : "failed");
  }
}
