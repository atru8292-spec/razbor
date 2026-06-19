// Отправка сообщений в Telegram напрямую через Bot API (для follow-up из воркера,
// без обращения к процессу бота). Без токена — мягко пропускаем.
import { env } from "./env";
import type { SendResult } from "./unisender";

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<SendResult> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN не задан." };
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const data = (await resp.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description ?? "telegram send failed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "telegram send failed" };
  }
}
