// Транспорт почты через Unisender Go (раздел 11/17 ТЗ) — ТОЛЬКО доставка.
// Пока нет ключа/отправителя — мягко пропускаем (skipped), не падаем.
import { env } from "./env";

const API = "https://go1.unisender.ru/ru/transactional/api/v1/email/send.json";

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!env.UNISENDER_GO_API_KEY || !env.EMAIL_FROM) {
    return { ok: false, skipped: true, error: "Unisender Go не настроен (нет ключа/отправителя)." };
  }
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: env.UNISENDER_GO_API_KEY,
        message: {
          recipients: [{ email: params.to }],
          subject: params.subject,
          body: { html: params.html },
          from_email: env.EMAIL_FROM,
          from_name: env.EMAIL_FROM_NAME,
          track_links: 1,
          track_read: 1,
        },
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as { status?: string; failed_emails?: unknown };
    if (!resp.ok || data.status === "error") {
      return { ok: false, error: `Unisender Go: ${JSON.stringify(data).slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
