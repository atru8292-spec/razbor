// Серверная верификация Cloudflare Turnstile (раздел 14 ТЗ).
import { env } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY не задан — проверка отклонена");
    return false;
  }
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set("remoteip", ip);
    const resp = await fetch(VERIFY_URL, { method: "POST", body });
    const data = (await resp.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] ошибка верификации:", e);
    return false;
  }
}
