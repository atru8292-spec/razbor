// Скрапер на Playwright (отдельный сервис на том же VPS, раздел 5 ТЗ).
// POST /scrape: десктоп+мобайл скриншоты, отрисованный и сырой HTML, извлечённые
// данные, AEO-сигналы. SSRF-защита, очередь по одной странице, мягкие ошибки.
import "dotenv/config";
import express from "express";
import { env } from "../lib/env";
import { enqueue } from "./queue";
import { scrapePage, closeBrowser } from "./browser";
import { ScrapeError } from "./ssrf";
import type { ScrapeErrorResult } from "../lib/scrape-types";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "razbor-scraper", step: 2 });
});

// Авторизация по ключу для всего, кроме /health.
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const key = req.get("x-scraper-key");
  if (!env.SCRAPER_KEY || key !== env.SCRAPER_KEY) {
    return res.status(401).json({ ok: false, code: "internal", error: "Unauthorized" });
  }
  next();
});

app.post("/scrape", async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  if (!url) {
    const err: ScrapeErrorResult = { ok: false, code: "invalid_url", error: "Не передан url." };
    return res.status(400).json(err);
  }

  try {
    const result = await enqueue(() => scrapePage(url));
    res.json(result);
  } catch (e) {
    if (e instanceof ScrapeError) {
      const status =
        e.code === "ssrf_blocked" || e.code === "invalid_url"
          ? 422
          : e.code === "timeout"
            ? 504
            : e.code === "unreachable" || e.code === "blocked"
              ? 502
              : 500;
      const err: ScrapeErrorResult = { ok: false, code: e.code, error: e.message };
      return res.status(status).json(err);
    }
    console.error("[scraper] неожиданная ошибка:", e);
    const err: ScrapeErrorResult = { ok: false, code: "internal", error: "Внутренняя ошибка скрапера." };
    res.status(500).json(err);
  }
});

// Слушаем только localhost — наружу не торчит, вызов локальный (defense in depth).
const server = app.listen(env.PORT, "127.0.0.1", () => {
  console.log(`[scraper] up on http://127.0.0.1:${env.PORT}`);
});

async function shutdown() {
  console.log("[scraper] SIGTERM, закрываемся");
  server.close();
  await closeBrowser();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
