// СМС-провайдер РФ (раздел 11 ТЗ) — опционально. Провайдер пока не выбран,
// поэтому no-op: если нет ключа — пропускаем; при наличии — здесь будет вызов API провайдера.
import { env } from "./env";
import type { SendResult } from "./unisender";

export async function sendSms(_params: { to: string; text: string }): Promise<SendResult> {
  if (!env.SMS_API_KEY) {
    return { ok: false, skipped: true, error: "СМС-провайдер не настроен." };
  }
  // TODO(Шаг тюнинга): подключить выбранного РФ-провайдера. Пока no-op.
  console.warn("[sms] SMS_API_KEY задан, но провайдер ещё не подключён — пропускаю.");
  return { ok: false, skipped: true, error: "СМС-провайдер не реализован." };
}
