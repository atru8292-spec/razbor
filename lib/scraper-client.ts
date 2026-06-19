// Клиент локального скрапера (раздел 5 ТЗ). Воркер вызывает /scrape.
import { env } from "./env";
import type { ScrapeResult, ScrapeErrorResult } from "./scrape-types";

export class ScraperError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ScraperError";
  }
}

export async function scrape(url: string): Promise<ScrapeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  let resp: Response;
  try {
    resp = await fetch(`${env.SCRAPER_URL}/scrape`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-scraper-key": env.SCRAPER_KEY ?? "" },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    });
  } catch {
    throw new ScraperError("Не удалось связаться со скрапером.", "scraper_down");
  } finally {
    clearTimeout(timer);
  }

  const data = (await resp.json()) as ScrapeResult | ScrapeErrorResult;
  if (!resp.ok || data.ok === false) {
    const err = data as ScrapeErrorResult;
    throw new ScraperError(err.error ?? "Сайт не удалось прочитать.", err.code ?? "scrape_failed");
  }
  return data as ScrapeResult;
}

/** Печать страницы в PDF через скрапер (раздел 4.9). Возвращает байты PDF. */
export async function renderPdf(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const resp = await fetch(`${env.SCRAPER_URL}/pdf`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-scraper-key": env.SCRAPER_KEY ?? "" },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    });
    const data = (await resp.json()) as { ok?: boolean; pdf?: string; error?: string };
    if (!resp.ok || !data.ok || !data.pdf) {
      throw new ScraperError(data.error ?? "PDF не сгенерирован.", "pdf_failed");
    }
    return Buffer.from(data.pdf, "base64");
  } finally {
    clearTimeout(timer);
  }
}
