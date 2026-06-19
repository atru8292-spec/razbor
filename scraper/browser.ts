import { chromium, devices, type Browser, type BrowserContext } from "playwright";
import sharp from "sharp";
import { parseAndValidateUrl, assertHostIsPublic, ScrapeError } from "./ssrf";
import { domExtractor } from "./extract";
import type { AeoSignals, ExtractedData, ScrapeResult, Shot } from "../lib/scrape-types";

// --- лимиты (раздел 5/15 ТЗ) ---
const NAV_TIMEOUT_MS = 30_000;
const RAW_FETCH_TIMEOUT_MS = 15_000;
const DESKTOP_VIEWPORT = { width: 1366, height: 900 };
const SHOT_MAX_WIDTH = { desktop: 1366, mobile: 420 };
const JPEG_QUALITY = 70;
const TEXT_LIMIT = 20_000;
const LIST_LIMIT = 40;
const HTML_LIMIT = 1_500_000;

const REAL_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// esbuild (через tsx) с keepNames вставляет вызовы __name в сериализуемые функции,
// а в контексте страницы его нет → page.evaluate падает с "__name is not defined".
// Шим строкой (строку esbuild не трогает) объявляет __name в каждом документе.
const ESBUILD_NAME_SHIM = "globalThis.__name = globalThis.__name || ((f) => f);";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
}

/** Печать страницы в PDF тем же Playwright (раздел 4.9/5). url — наша /print/[id]. */
export async function renderPdf(url: string): Promise<Buffer> {
  const br = await getBrowser();
  // reduce → счётчики/радар рисуются сразу (без скролл-триггера в headless-печати)
  const ctx = await br.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { timeout: NAV_TIMEOUT_MS, waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16px", bottom: "16px", left: "16px", right: "16px" },
    });
  } finally {
    await page.close().catch(() => {});
    await ctx.close().catch(() => {});
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

/** Сжать и уменьшить скриншот, вернуть base64 jpeg (раздел 5: уменьшать перед vision). */
async function toShot(png: Buffer, maxWidth: number): Promise<Shot> {
  // Ресайз только по ширине: длинный лендинг остаётся читаемым (высота свободная).
  // Дальнейший даунскейл под бюджет vision — на стороне воркера (CLAUDE.md).
  const jpeg = await sharp(png)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  const meta = await sharp(jpeg).metadata();
  return {
    base64: jpeg.toString("base64"),
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: jpeg.length,
  };
}

/** Закрыть попапы/куки-баннеры перед скриншотом (эвристика, консервативно). */
async function dismissOverlays(page: import("playwright").Page): Promise<void> {
  await page
    .evaluate(() => {
      const accept = ["принять", "согласен", "согласна", "хорошо", "ок", "ok", "accept", "allow", "agree", "понятно", "закрыть", "close"];
      // клик по кнопкам согласия (только button/role=button/input — без ссылок, чтобы не уйти со страницы)
      for (const el of Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))) {
        const raw = (el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "";
        const t = raw.trim().toLowerCase();
        if (t && t.length < 30 && accept.some((x) => t === x || t.includes(x))) {
          try {
            (el as HTMLElement).click();
          } catch {
            /* ignore */
          }
        }
      }
      // спрятать оверлеи по типовым селекторам
      const sel = '[role="dialog"], [class*="popup"], [class*="modal"], [class*="cookie"], [class*="overlay"], [id*="cookie"], .t-popup, .t-popup__container, .t-cookiesbar';
      for (const el of Array.from(document.querySelectorAll(sel))) {
        (el as HTMLElement).style.setProperty("display", "none", "important");
      }
      // спрятать крупные fixed/sticky-перекрытия (модалки на весь экран)
      const area = window.innerWidth * window.innerHeight;
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "sticky") {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.width * r.height > area * 0.5 && Number(cs.zIndex || "0") > 100) {
            (el as HTMLElement).style.setProperty("display", "none", "important");
          }
        }
      }
    })
    .catch(() => {});
  await page.waitForTimeout(300);
}

/** Прокрутка до низа: триггерит lazy-load картинок (Tilda и пр.), потом возврат наверх. */
async function autoScroll(page: import("playwright").Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const step = 800;
      let total = 0;
      let guard = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        guard += 1;
        if (total >= document.body.scrollHeight - window.innerHeight || guard > 60) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 150);
    });
  });
  await page.waitForTimeout(800); // дать догрузиться картинкам после скролла
}

interface ShootResult {
  shot: Buffer;
  finalUrl: string;
  status: number | null;
  html: string;
  extracted: ExtractedData | null;
}

/** Навигация (с проверкой редиректов) + скриншот; опционально извлечение DOM. */
async function shoot(ctx: BrowserContext, url: string, withExtract: boolean): Promise<ShootResult> {
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, {
      timeout: NAV_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    // финальный URL после редиректов обязан остаться публичным
    const finalUrl = page.url();
    await assertHostIsPublic(new URL(finalUrl).hostname);

    // добор подгрузки, но без падения если networkidle не наступит
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    const extracted = withExtract
      ? await page.evaluate(domExtractor, { textLimit: TEXT_LIMIT, listLimit: LIST_LIMIT })
      : null;
    await autoScroll(page);
    await dismissOverlays(page);
    const shot = await page.screenshot({ fullPage: true, type: "png" });
    const html = (await page.content()).slice(0, HTML_LIMIT);
    return { shot, finalUrl, status: resp?.status() ?? null, html, extracted };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Сырой (без JS) HTML — нужен для AEO (раздел 6.1). Некритичный шаг. */
async function fetchRawHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RAW_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": REAL_UA },
    });
    // финальный URL сырого ответа тоже проверяем на SSRF
    await assertHostIsPublic(new URL(resp.url).hostname);
    const html = await resp.text();
    return html.slice(0, HTML_LIMIT);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAeo(rawHtml: string | null, extracted: ExtractedData): AeoSignals {
  if (rawHtml === null) {
    return {
      hasSchemaInRaw: false,
      rawTextLength: 0,
      renderedTextLength: extracted.visibleText.length,
      serverRenderedRatio: null,
      rawFetched: false,
    };
  }
  const rawTextLength = stripToText(rawHtml).length;
  const renderedTextLength = extracted.visibleText.length;
  return {
    hasSchemaInRaw: /application\/ld\+json/i.test(rawHtml),
    rawTextLength,
    renderedTextLength,
    serverRenderedRatio:
      renderedTextLength > 0
        ? Math.min(1, Number((rawTextLength / renderedTextLength).toFixed(2)))
        : null,
    rawFetched: true,
  };
}

/** Главная функция: снять сайт (desktop + mobile), извлечь данные, собрать AEO. */
export async function scrapePage(input: string): Promise<ScrapeResult> {
  const started = Date.now();
  const url = parseAndValidateUrl(input);
  await assertHostIsPublic(url.hostname);
  const target = url.toString();

  const br = await getBrowser();

  // сырой HTML тянем параллельно со снятием — он независим
  const rawHtmlPromise = fetchRawHtml(target);

  // desktop — здесь же извлекаем DOM (одна навигация)
  const desktopCtx = await br.newContext({
    viewport: DESKTOP_VIEWPORT,
    userAgent: REAL_UA,
    locale: "ru-RU",
    ignoreHTTPSErrors: true,
  });
  await desktopCtx.addInitScript(ESBUILD_NAME_SHIM);
  let desktopRes: ShootResult;
  try {
    desktopRes = await shoot(desktopCtx, target, true);
  } catch (e) {
    await desktopCtx.close().catch(() => {});
    throw normalizeNavError(e);
  }
  await desktopCtx.close().catch(() => {});
  const extracted = desktopRes.extracted as ExtractedData;

  // mobile (профиль iPhone 13)
  const mobileCtx = await br.newContext({
    ...devices["iPhone 13"],
    locale: "ru-RU",
    ignoreHTTPSErrors: true,
  });
  await mobileCtx.addInitScript(ESBUILD_NAME_SHIM);
  let mobileRes: ShootResult;
  try {
    mobileRes = await shoot(mobileCtx, target, false);
  } catch (e) {
    await mobileCtx.close().catch(() => {});
    throw normalizeNavError(e);
  }
  await mobileCtx.close().catch(() => {});

  const rawHtml = await rawHtmlPromise;

  const [desktopShot, mobileShot] = await Promise.all([
    toShot(desktopRes.shot, SHOT_MAX_WIDTH.desktop),
    toShot(mobileRes.shot, SHOT_MAX_WIDTH.mobile),
  ]);

  return {
    ok: true,
    requestedUrl: target,
    finalUrl: desktopRes.finalUrl,
    httpStatus: desktopRes.status,
    desktop: desktopShot,
    mobile: mobileShot,
    renderedHtml: desktopRes.html,
    rawHtml,
    extracted,
    aeo: buildAeo(rawHtml, extracted),
    timingMs: Date.now() - started,
  };
}

/** Превращает ошибки Playwright/сети в понятный ScrapeError (мягкие ошибки, CLAUDE.md). */
function normalizeNavError(e: unknown): ScrapeError {
  if (e instanceof ScrapeError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[scraper] nav/processing error:", msg);
  if (/timeout/i.test(msg)) return new ScrapeError("timeout", "Сайт не успел загрузиться.");
  if (/net::ERR|ECONN|ENOTFOUND|EAI_AGAIN|DNS/i.test(msg))
    return new ScrapeError("unreachable", "Не удалось открыть сайт.");
  return new ScrapeError("blocked", "Сайт не удалось прочитать.");
}
