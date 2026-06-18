// Telegram-бот выдачи подарка (отдельный pm2-процесс, разделы 11–12 ТЗ).
// Шаг 1: только каркас. Если токена нет — процесс просто живёт и ждёт (не падает).
// Диплинк ?start=ТОКЕН, выдача подарка и follow-up — Шаг 6.
import "dotenv/config";
import { env } from "../lib/env";

async function main() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log("[bot] TELEGRAM_BOT_TOKEN не задан — каркас работает вхолостую (Шаг 6)");
    // Держим процесс живым, чтобы pm2 не считал его упавшим.
    setInterval(() => {}, 60_000);
    return;
  }

  // Реальный запуск Telegraf — на Шаге 6. Сейчас только подтверждаем наличие токена.
  console.log("[bot] токен есть, запуск бота — Шаг 6");
  setInterval(() => {}, 60_000);
}

main().catch((err) => {
  console.error("[bot] фатальная ошибка:", err);
  process.exit(1);
});
