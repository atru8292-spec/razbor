// Фоновый воркер аудитов (отдельный pm2-процесс, раздел 4 ТЗ).
// Шаг 1: только каркас процесса — поднимается, живёт, логирует heartbeat.
// Пайплайн аудита (скрапер → тип сайта → PageSpeed → AEO → vision) — Шаг 4.
import "dotenv/config";
import { env } from "../lib/env";

console.log(`[worker] up. APP_BASE_URL=${env.APP_BASE_URL}`);

// Держим процесс живым. На Шаге 4 здесь появится опрос pending-задач из БД.
setInterval(() => {
  console.log("[worker] heartbeat");
}, 60_000);

process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM, выходим");
  process.exit(0);
});
