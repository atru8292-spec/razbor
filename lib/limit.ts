// Лимиты (разделы 10, 14 ТЗ): один бесплатный аудит на контакт в месяц + IP-предохранители.
import { getSupabase } from "./supabase";
import { config } from "./config";

export interface NormalizedContact {
  phone: string | null;
  telegram: string | null;
  email: string | null;
  channel: "phone" | "telegram" | "email";
}

function normPhone(s: string): string | null {
  let d = s.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 11 && d[0] === "8") d = "7" + d.slice(1);
  if (d.length === 10) d = "7" + d;
  return "+" + d;
}

function normTelegram(s: string): string | null {
  const t = s
    .trim()
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^@/, "")
    .toLowerCase();
  return t || null;
}

function normEmail(s: string | null | undefined): string | null {
  if (!s) return null;
  const e = s.trim().toLowerCase();
  return e || null;
}

/**
 * Одно поле контакта (телефон ИЛИ телеграм) + опциональная почта (раздел 11).
 * Канал определяем по содержимому: буквы/@ → телеграм, иначе телефон.
 */
export function normalizeContact(contact: string, email?: string | null): NormalizedContact {
  const looksLikeTelegram = /[a-zA-Zа-яА-Я]/.test(contact) || contact.trim().startsWith("@");
  const e = normEmail(email);

  if (looksLikeTelegram) {
    return { phone: null, telegram: normTelegram(contact), email: e, channel: "telegram" };
  }
  const phone = normPhone(contact);
  if (phone) {
    return { phone, telegram: null, email: e, channel: "phone" };
  }
  // не телефон и не похоже на телеграм — трактуем как телеграм-строку
  return { phone: null, telegram: normTelegram(contact), email: e, channel: "telegram" };
}

/** Был ли этот контакт уже за последние 30 дней (раздел 10). */
export async function isContactRateLimited(c: NormalizedContact): Promise<boolean> {
  const ors: string[] = [];
  if (c.phone) ors.push(`phone.eq.${c.phone}`);
  if (c.telegram) ors.push(`telegram.eq.${c.telegram}`);
  if (c.email) ors.push(`email.eq.${c.email}`);
  if (ors.length === 0) return false;

  const since = new Date(Date.now() - config.freeAuditWindowDays * 86_400_000).toISOString();
  const { data, error } = await getSupabase()
    .from("leads")
    .select("id")
    .gte("created_at", since)
    .or(ors.join(","))
    .limit(1);

  if (error) {
    console.error("[limit] ошибка проверки контакта:", error);
    return false; // мягко: не блокируем из-за сбоя БД
  }
  return (data?.length ?? 0) > 0;
}

/** IP клиента из заголовков (за nginx). */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Дневные предохранители на старте аудита: глобальный и по IP (считаем по events). */
export async function checkAuditStartAllowed(
  ip: string,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const sb = getSupabase();

  const { count: globalCount } = await sb
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("step", "audit_started")
    .gte("created_at", since);

  // эффективный дневной потолок = min(лимит по числу, лимит по бюджету) — раздел 14/15
  const maxByBudget = Math.floor(config.dailyBudgetUsd / config.estAuditCostUsd);
  const dailyCap = Math.min(config.maxAuditsPerDay, maxByBudget);
  if ((globalCount ?? 0) >= dailyCap) {
    return { allowed: false, reason: "Сегодня сервис принял максимум проверок. Загляните завтра." };
  }

  if (ip !== "unknown") {
    const { count: ipCount } = await sb
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("step", "audit_started")
      .filter("meta->>ip", "eq", ip)
      .gte("created_at", since);

    if ((ipCount ?? 0) >= config.maxIpAuditsPerDay) {
      return { allowed: false, reason: "Слишком много проверок с этого адреса. Попробуйте завтра." };
    }
  }

  return { allowed: true };
}
