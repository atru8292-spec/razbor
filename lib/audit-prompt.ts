// Промпт аудита (раздел 7 ТЗ, дословно) + сборка входа + zod-схема результата (раздел 8).
import { z } from "zod";
import type { ExtractedData, AeoSignals } from "./scrape-types";
import type { PageSpeedMetrics } from "./pagespeed";
import type { SiteType } from "./site-type";
import type { AuditResult } from "./audit-types";

// --- системный промпт: раздел 7 ТЗ, без изменений ---
export const AUDIT_SYSTEM_PROMPT = `Ты senior CRO и UX аудитор уровня сильного агентства.
Анализируешь сайт СТРОГО по предоставленным данным: скриншоты (десктоп и мобайл),
извлечённый текст и структура, метрики скорости, данные конкурентов.
Задача: где и почему сайт теряет деньги.

Каркас LIFT, оцени 6 сил вокруг ценностного предложения:
value_prop, relevance, clarity, anxiety, distraction, urgency.
Конверсия растёт от релевантности, ясности, срочности и падает от отвлечения и тревоги.

Тебе передаются: тип сайта и (если есть) заявленная цель сайта. Учитывай их:
суди сайт по нормам его типа и оценивай релевантность относительно его цели.

Жёсткие правила:
1. Оценивай только то, что видишь в данных. Не выдумывай отсутствующее.
2. Никаких общих советов. Каждый вывод цитирует конкретный элемент ЭТОГО сайта.
3. Для находки: что не так, почему теряются заявки (механика), критичность (high/medium/low),
   и грубая оценка потери (impact_estimate): диапазон в % конверсии или словами про деньги,
   честно, без фейковой точности. Если оценить нельзя — так и скажи.
4. Тон экспертный, прямой, уважительный, без воды.
5. Конкурентный разрыв: что есть у большинства конкурентов, но нет у этого сайта.

Проверь 8 направлений (ценность и релевантность; первый экран за 5 сек;
структура и логика воронки; доверие и возражения; путь к действию и трение;
мобайл и юзабилити; техника, скорость, SEO-база; ИИ-видимость/AEO — видят ли сайт
ИИ-поисковики, по schema, серверному рендеру контента, семантике и мета).

Дай оценки 0-100: conversion_score, usability_score, aeo_score, overall_score и каждую из 6 сил LIFT.
Ранжируй находки по влиянию на деньги. Верни СТРОГО валидный JSON по схеме.

ТОН: пиши живым экспертным языком, как будто объясняешь владельцу бизнеса лично —
конкретно, по-человечески, без канцелярита и сухого технического отчёта. Прямо называй проблему
и её цену для бизнеса. При этом сохраняй точность, цитаты элементов и все правила выше.`;

// Подсказка по форме JSON (схема раздела 8) — добавляется к user-контенту.
const SCHEMA_HINT = `Верни JSON строго такой формы:
{
 "site_type":"ecommerce|leadgen|saas|info|local",
 "goal":"эхо цели или null",
 "overall_score":0,"conversion_score":0,"usability_score":0,"aeo_score":0,
 "lift":{"value_prop":0,"relevance":0,"clarity":0,"anxiety":0,"distraction":0,"urgency":0},
 "verdict":"где главная утечка денег",
 "areas":[{"key":"value|hero|structure|trust|action|mobile|tech|aeo","title":"...","score":0,
   "findings":[{"type":"leak|doubt","severity":"high|medium|low|ok",
     "finding":"...","why_it_hurts":"...","evidence":"цитата элемента ЭТОГО сайта",
     "conversion_impact":"high|medium|low","impact_estimate":"грубо в % или деньгах, или null"}]}],
 "competitor_gaps":[{"missing":"...","competitors_have_it":["..."],"impact":"..."}],
 "top_priorities":["...","...","..."],
 "detailed_fixes":[{"area":"...","fix":"...","effort":"low|medium|high","expected_effect":"..."}]
}`;

export interface PromptContext {
  url: string;
  siteType: SiteType;
  niche: string | null;
  goal: string | null;
  extracted: ExtractedData;
  aeo: AeoSignals;
  pagespeed: { mobile: PageSpeedMetrics | null; desktop: PageSpeedMetrics | null };
  // Выжимки по конкурентам (раздел 9). Скриншоты конкурентов идут картинками отдельно.
  competitors: { url: string; summary: string }[];
}

function ps(m: PageSpeedMetrics | null): string {
  if (!m) return "нет данных";
  return `score=${m.performanceScore ?? "?"}, LCP=${m.lcp ?? "?"}, CLS=${m.cls ?? "?"}, INP/TBT=${m.inp ?? "?"}`;
}

/** Текстовая часть user-сообщения. Скриншоты добавляются отдельно картинками. */
export function buildUserText(ctx: PromptContext): string {
  const e = ctx.extracted;
  const lines = [
    `АНАЛИЗИРУЕМЫЙ САЙТ: ${ctx.url}`,
    `Тип сайта: ${ctx.siteType}${ctx.niche ? ` (ниша: ${ctx.niche})` : ""}`,
    `Заявленная цель сайта: ${ctx.goal ?? "не указана"}`,
    "",
    "=== ИЗВЛЕЧЁННЫЕ ДАННЫЕ ===",
    `Title: ${e.title}`,
    `Meta description: ${e.metaDescription ?? "нет"}`,
    `lang: ${e.lang ?? "нет"}`,
    `H1: ${e.headings.h1.join(" | ") || "нет"}`,
    `H2: ${e.headings.h2.slice(0, 12).join(" | ") || "нет"}`,
    `H3: ${e.headings.h3.slice(0, 12).join(" | ") || "нет"}`,
    `Кнопки/CTA: ${e.buttons.slice(0, 20).join(" | ") || "нет"}`,
    `Формы (число полей): ${e.forms.map((f) => f.fieldCount).join(", ") || "нет форм"}`,
    `Телефон: ${e.phone ?? "не найден"}`,
    `Картинок: ${e.imageCount}, видео: ${e.videoCount}`,
    "",
    "=== СКОРОСТЬ (PageSpeed) ===",
    `Мобайл: ${ps(ctx.pagespeed.mobile)}`,
    `Десктоп: ${ps(ctx.pagespeed.desktop)}`,
    "",
    "=== ИИ-ВИДИМОСТЬ (AEO, факты) ===",
    `schema.org на странице: ${e.hasSchema ? e.schemaTypes.join(", ") : "нет"}`,
    `schema в сыром HTML (без JS): ${ctx.aeo.hasSchemaInRaw ? "есть" : "нет"}`,
    `Серверный рендер контента (raw/rendered): ${ctx.aeo.serverRenderedRatio ?? "неизвестно"} (1 = контент в HTML, ~0 = всё на клиенте)`,
    "",
    "=== ВИДИМЫЙ ТЕКСТ СТРАНИЦЫ (фрагмент) ===",
    e.visibleText.slice(0, 12000),
    "",
    "=== КОНКУРЕНТЫ ===",
    ctx.competitors.length > 0
      ? `Ниже ${ctx.competitors.length} конкурент(а/ов) — выжимки и их скриншоты приложены картинками после скринов целевого сайта (в том же порядке). Заполни competitor_gaps: что есть у большинства из них, но нет у целевого сайта.\n\n` +
        ctx.competitors.map((c, i) => `Конкурент ${i + 1} (${c.url}):\n${c.summary}`).join("\n\n")
      : "Данных по конкурентам нет — competitor_gaps оставь пустым массивом.",
    "",
    SCHEMA_HINT,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

// --- zod-схема результата (раздел 8), лояльная к мелким отклонениям модели ---
const score = z.coerce.number().pipe(z.number().min(0).max(100)).catch(0);

const findingSchema = z.object({
  type: z.enum(["leak", "doubt"]).catch("leak"),
  severity: z.enum(["high", "medium", "low", "ok"]).catch("medium"),
  finding: z.string(),
  why_it_hurts: z.string().default(""),
  evidence: z.string().default(""),
  conversion_impact: z.enum(["high", "medium", "low"]).catch("medium"),
  impact_estimate: z.string().nullable().default(null),
});

const areaSchema = z.object({
  key: z.string(),
  title: z.string(),
  score: score,
  findings: z.array(findingSchema).default([]),
});

const resultSchema = z.object({
  site_type: z.string(),
  goal: z.string().nullable().default(null),
  overall_score: score,
  conversion_score: score,
  usability_score: score,
  aeo_score: score,
  lift: z.object({
    value_prop: score,
    relevance: score,
    clarity: score,
    anxiety: score,
    distraction: score,
    urgency: score,
  }),
  verdict: z.string(),
  areas: z.array(areaSchema).default([]),
  competitor_gaps: z
    .array(z.object({ missing: z.string(), competitors_have_it: z.array(z.string()).default([]), impact: z.string().default("") }))
    .default([]),
  top_priorities: z.array(z.string()).default([]),
  detailed_fixes: z
    .array(
      z.object({
        area: z.string().default(""),
        fix: z.string(),
        effort: z.enum(["low", "medium", "high"]).catch("medium"),
        expected_effect: z.string().default(""),
      }),
    )
    .default([]),
});

/** Валидирует и нормализует ответ модели. Бросает при принципиально кривом JSON. */
export function parseAuditResult(json: unknown): AuditResult {
  return resultSchema.parse(json) as AuditResult;
}
