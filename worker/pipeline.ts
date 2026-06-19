// Пайплайн аудита на один сайт (раздел 4 ТЗ, шаги 1-7,10). Конкуренты — раздел 9.
import sharp from "sharp";
import { scrape } from "../lib/scraper-client";
import { classifySite } from "../lib/site-type";
import { getPageSpeed } from "../lib/pagespeed";
import { findCompetitors } from "../lib/competitors";
import { createJsonResponse, extractJson } from "../lib/openai";
import { AUDIT_SYSTEM_PROMPT, buildUserText, parseAuditResult, type PromptContext } from "../lib/audit-prompt";
import { env } from "../lib/env";
import { config } from "../lib/config";
import type { AuditResult } from "../lib/audit-types";
import type { ScrapeResult } from "../lib/scrape-types";

interface VisionShot {
  base64: string;
  width: number;
  height: number;
}

export interface CompetitorShot {
  url: string;
  name: string;
  shot: VisionShot;
}

export interface PipelineOutput {
  result: AuditResult;
  screenshots: { desktop: VisionShot; mobile: VisionShot; competitors: { url: string; name: string; base64: string }[] };
  siteType: string;
  usage: { prompt: number; completion: number } | null;
}

/** Уменьшить скриншот под vision: ширина + обрезка верхней части (раздел 15). */
async function resizeForVision(base64: string, width: number, maxHeight: number = config.visionImage.maxHeight): Promise<VisionShot> {
  const src = Buffer.from(base64, "base64");
  let buf = await sharp(src).resize({ width, withoutEnlargement: true }).jpeg({ quality: config.visionImage.jpegQuality }).toBuffer();
  let meta = await sharp(buf).metadata();
  if ((meta.height ?? 0) > maxHeight) {
    buf = await sharp(buf)
      .extract({ left: 0, top: 0, width: meta.width ?? width, height: maxHeight })
      .jpeg({ quality: config.visionImage.jpegQuality })
      .toBuffer();
    meta = await sharp(buf).metadata();
  }
  return { base64: buf.toString("base64"), width: meta.width ?? width, height: meta.height ?? 0 };
}

/** Компактная фактическая выжимка по конкуренту для vision (раздел 9.4). */
function competitorSummary(s: ScrapeResult): string {
  const e = s.extracted;
  return [
    `Title: ${e.title}`,
    `H1: ${e.headings.h1.slice(0, 2).join(" | ") || "нет"}`,
    `CTA: ${e.buttons.slice(0, 8).join(" | ") || "нет"}`,
    `Формы (поля): ${e.forms.map((f) => f.fieldCount).join(", ") || "нет"}`,
    `Телефон: ${e.phone ?? "нет"}`,
    `Schema: ${e.hasSchema ? e.schemaTypes.join(", ") : "нет"}`,
  ].join("; ");
}

async function callVision(ctx: PromptContext, imagesB64: string[]) {
  const userText = buildUserText(ctx);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, usage } = await createJsonResponse({
      model: env.OPENAI_VISION_MODEL,
      system: AUDIT_SYSTEM_PROMPT,
      userText,
      imagesB64,
    });
    try {
      const result = parseAuditResult(extractJson(text));
      return { result, usage };
    } catch (e) {
      lastErr = e;
      console.error(`[pipeline] vision JSON невалиден (попытка ${attempt + 1}):`, e);
    }
  }
  throw new Error(`Модель вернула некорректный JSON: ${String(lastErr)}`);
}

/** Найти и снять до competitorSnapTarget конкурентов. Мягко: ошибки снятия пропускаем. */
async function gatherCompetitors(
  targetUrl: string,
  niche: string | null,
  geo: string | null,
  setProgress: (p: string) => Promise<void>,
): Promise<{ summaries: { url: string; summary: string }[]; shots: CompetitorShot[] }> {
  await setProgress("Ищу конкурентов…");
  const candidates = await findCompetitors(targetUrl, niche, geo);
  if (candidates.length === 0) return { summaries: [], shots: [] };

  const summaries: { url: string; summary: string }[] = [];
  const shots: CompetitorShot[] = [];

  for (const c of candidates) {
    if (shots.length >= config.competitorSnapTarget) break;
    await setProgress(`Снимаю конкурентов (${shots.length + 1}/${config.competitorSnapTarget})…`);
    try {
      const s = await scrape(c.url);
      const shot = await resizeForVision(s.desktop.base64, config.visionImage.competitorWidth, config.visionImage.competitorMaxHeight);
      summaries.push({ url: c.url, summary: competitorSummary(s) });
      shots.push({ url: c.url, name: c.name, shot });
    } catch (e) {
      console.error(`[pipeline] конкурент ${c.url} не снят, пропускаю:`, e instanceof Error ? e.message : e);
    }
  }
  return { summaries, shots };
}

export async function runPipeline(
  audit: { id: string; url: string; goal: string | null },
  setProgress: (p: string) => Promise<void>,
): Promise<PipelineOutput> {
  // 2. Скрапер
  await setProgress("Снимаю сайт…");
  const scraped = await scrape(audit.url);

  // 3. Тип сайта + ниша + гео
  await setProgress("Определяю тип сайта…");
  const { site_type, niche, geo } = await classifySite(scraped.finalUrl, scraped.extracted);

  // 4. PageSpeed (некритично)
  await setProgress("Считаю скорость…");
  const pagespeed = await getPageSpeed(scraped.finalUrl);

  // 6. Конкуренты (раздел 9): веб-поиск + снятие скрапером. Мягкий fallback.
  const { summaries, shots } = await gatherCompetitors(scraped.finalUrl, niche, geo, setProgress);

  // 5-7. AEO-факты + главный vision-вызов
  await setProgress("Анализирую сайт…");
  const [desktop, mobile] = await Promise.all([
    resizeForVision(scraped.desktop.base64, config.visionImage.desktopWidth),
    resizeForVision(scraped.mobile.base64, config.visionImage.mobileWidth),
  ]);

  const ctx: PromptContext = {
    url: scraped.finalUrl,
    siteType: site_type,
    niche,
    goal: audit.goal,
    extracted: scraped.extracted,
    aeo: scraped.aeo,
    pagespeed,
    competitors: summaries,
  };

  // картинки: целевой десктоп+мобайл, затем скрины конкурентов в том же порядке, что и выжимки
  const images = [desktop.base64, mobile.base64, ...shots.map((c) => c.shot.base64)];
  const { result, usage } = await callVision(ctx, images);
  // тип из колонки приоритетнее эха модели
  result.site_type = site_type;
  result.goal = audit.goal;

  return {
    result,
    screenshots: {
      desktop,
      mobile,
      competitors: shots.map((c) => ({ url: c.url, name: c.name, base64: c.shot.base64 })),
    },
    siteType: site_type,
    usage,
  };
}
