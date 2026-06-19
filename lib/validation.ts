import { z } from "zod";

// Цель сайта (раздел 2): необязательный выпадающий список или короткий ввод.
export const GOAL_OPTIONS = ["заявки", "продажи", "запись", "подписка"] as const;

export const auditRequestSchema = z.object({
  url: z.string().min(3).max(2048),
  goal: z.string().max(200).optional().nullable(),
  turnstileToken: z.string().min(1, "Пройдите проверку, что вы не робот."),
});

export const leadRequestSchema = z.object({
  auditId: z.string().uuid(),
  contact: z.string().min(2).max(200),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Нужно согласие на обработку данных." }) }),
});

const EVENT_STEPS = [
  "landed",
  "url_entered",
  "audit_started",
  "teaser_shown",
  "contact_opened",
  "contact_submitted",
  "contact_abandoned",
  "report_viewed",
  "pdf_downloaded",
  "followup_clicked",
] as const;

export const eventSchema = z.object({
  step: z.enum(EVENT_STEPS),
  auditId: z.string().uuid().optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
});

/** Нормализует введённый URL: дописывает https://, проверяет протокол и наличие домена. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
