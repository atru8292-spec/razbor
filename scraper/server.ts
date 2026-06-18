// Скрапер на Playwright (отдельный сервис на том же VPS, раздел 5 ТЗ).
// Шаг 1: только Express-каркас с /health, чтобы проверить pm2-обвязку.
// Реальный POST /scrape (Playwright, SSRF-защита, очередь, скриншоты) — Шаг 2.
import "dotenv/config";
import express from "express";
import { env } from "../lib/env";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "razbor-scraper", step: 1 });
});

// Заглушка: на Шаге 2 здесь появится реальная логика снятия сайта.
app.post("/scrape", (_req, res) => {
  res.status(501).json({ error: "scraper не реализован (Шаг 2)" });
});

app.listen(env.PORT, () => {
  console.log(`[scraper] up on http://localhost:${env.PORT}`);
});
