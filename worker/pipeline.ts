// Пайплайн аудита на один сайт (раздел 4 ТЗ, шаги 1-7,10 — без конкурентов/аннотаций/PDF).
import sharp from "sharp";
import { scrape } from "../lib/scraper-client";
import { classifySite } from "../lib/site-type";
import { getPageSpeed } from "../lib/pagespeed";
import { createJsonResponse, extractJson } from "../lib/openai";
import { AUDIT_SYSTEM_PROMPT, buildUserText, parseAuditResult, type PromptContext } from "../lib/audit-prompt";
import { env } from "../lib/env";
import { config } from "../lib/config";
import type { AuditResult } from "../lib/audit-types";

export interface PipelineOutput {
  result: AuditResult;
  screenshots: { desktop: VisionShot; mobile: VisionShot };
  siteType: string;
  usage: { prompt: number; completion: number } | null;
}

interface VisionShot {
  base64: string;
  width: number;
  height: number;
}

/** Уменьшить скриншот под vision: ширина + обрезка верхней части (раздел 15). */
async function resizeForVision(base64: string, width: number): Promise<VisionShot> {
  const src = Buffer.from(base64, "base64");
  let buf = await sharp(src).resize({ width, withoutEnlargement: true }).jpeg({ quality: config.visionImage.jpegQuality }).toBuffer();
  let meta = await sharp(buf).metadata();
  if ((meta.height ?? 0) > config.visionImage.maxHeight) {
    buf = await sharp(buf)
      .extract({ left: 0, top: 0, width: meta.width ?? width, height: config.visionImage.maxHeight })
      .jpeg({ quality: config.visionImage.jpegQuality })
      .toBuffer();
    meta = await sharp(buf).metadata();
  }
  return { base64: buf.toString("base64"), width: meta.width ?? width, height: meta.height ?? 0 };
}

async function callVision(ctx: PromptContext, desktop: VisionShot, mobile: VisionShot) {
  const userText = buildUserText(ctx);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, usage } = await createJsonResponse({
      model: env.OPENAI_VISION_MODEL,
      system: AUDIT_SYSTEM_PROMPT,
      userText,
      imagesB64: [desktop.base64, mobile.base64],
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

export async function runPipeline(
  audit: { id: string; url: string; goal: string | null },
  setProgress: (p: string) => Promise<void>,
): Promise<PipelineOutput> {
  // 2. Скрапер
  await setProgress("Снимаю сайт…");
  const scraped = await scrape(audit.url);

  // 3. Тип сайта + ниша
  await setProgress("Определяю тип сайта…");
  const { site_type, niche } = await classifySite(scraped.finalUrl, scraped.extracted);

  // 4. PageSpeed (некритично)
  await setProgress("Считаю скорость…");
  const pagespeed = await getPageSpeed(scraped.finalUrl);

  // 5-6. AEO-факты + главный vision-вызов
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
    hasCompetitors: false, // конкуренты — Шаг 5
  };

  const { result, usage } = await callVision(ctx, desktop, mobile);
  // тип из колонки приоритетнее эха модели
  result.site_type = site_type;
  result.goal = audit.goal;

  return { result, screenshots: { desktop, mobile }, siteType: site_type, usage };
}
