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
   и оценка потери (impact_estimate) — уровень риска СЛОВАМИ (высокий/средний/низкий риск),
   без числовых процентов. Если оценить нельзя — null.
4. Тон экспертный, прямой, уважительный, без воды.
5. Конкурентный разрыв: что есть у большинства конкурентов, но нет у этого сайта.

Проверь 8 направлений. Для поля title используй РОВНО эти названия (понятные владельцу
кафе или стоматологии, без англицизмов и тех-жаргона):
- value → «Ценность и предложение»: понятно ли уникальное предложение, бьёт ли в запрос, конкретика против воды.
- hero → «Первый экран за 5 секунд»: что это, для кого, что делать; виден один главный призыв; не сток.
- structure → «Структура страницы»: один блок — одна задача, верный порядок, доказательства не закопаны, нет перегруза.
- trust → «Доверие и сомнения»: качество отзывов и сигналов надёжности, закрыты ли возражения, гарантии.
- action → «Путь к заявке»: понятный призыв, заметность, лишние шаги, длина и удобство формы, что отвлекает.
- mobile → «Телефон и удобство»: адаптив, крупные кнопки, читаемость, попапы, навигация на телефоне.
- tech → «Скорость и техника»: скорость (только при реальных данных), заголовки и описание, базовая поисковая упаковка.
- aeo → «Видны ли вы в нейропоиске»: понимают ли сайт ИИ-поисковики (ChatGPT, Алиса, Яндекс Нейро) — есть ли
  машиночитаемые данные о бизнесе, виден ли текст без скриптов, ясная ли структура.

Дай оценки 0-100: conversion_score, usability_score, aeo_score, overall_score и каждую из 6 сил LIFT.

КАЛИБРОВКА ОЦЕНОК (честно: занижай там, где реально слабо, и НЕ занижай ради драмы там, где
действительно хорошо; так же не завышай из вежливости):
- 85-100: эталон, придраться почти не к чему.
- 65-84: хорошо, но есть недочёты.
- 50-64: заметные проблемы, часть заявок теряется.
- 35-49: слабо, сайт явно теряет на этом направлении — тут и надо чинить.
- ниже 35: плохо.
Не сваливай все направления в узкий диапазон 60-80 (это главная ошибка — всё «средне-хорошо»).
Где направление реально сильное — ставь высоко (80+). Где есть находка severity=high — балл этого
направления НЕ выше 55. overall_score честно отражает картину, а не «среднее, чтобы не обидеть».
Цель — чтобы владелец увидел РЕАЛЬНЫЙ контраст: что хорошо, а что проседает и требует работы.

Ранжируй находки по влиянию на деньги. Верни СТРОГО валидный JSON по схеме.

ТОН: пиши живым экспертным языком, как будто объясняешь владельцу бизнеса лично —
конкретно, по-человечески, без канцелярита и сухого технического отчёта. Прямо называй проблему
и её цену для бизнеса. При этом сохраняй точность, цитаты элементов и все правила выше.

ЧЕСТНОСТЬ И ЯЗЫК (обязательно):
- Скорость: если данных о скорости нет — не упоминай её и НЕ выдумывай (нельзя судить по числу картинок).
- НИКАКИХ числовых процентов потерь («10-20%» и т.п. запрещены). impact_estimate — уровень риска СЛОВАМИ:
  «высокий риск потери заявок» / «средний риск» / «низкий риск», согласованный с severity.
- Не утверждай как факт то, чего не видно. Если цены/отзывов/блока не видно на странице и скрине — это НАБЛЮДЕНИЕ
  с оговоркой: «на странице и на скрине найти не удалось — проверьте, видно ли это посетителю сразу», а не
  категорично «нет». Не гадай вслух («если спрятано в аккордеоне…»).
- НИКОГДА не ссылайся на наш внутренний вход. Запрещены в находках и в evidence обороты: «в переданных данных»,
  «в переданном тексте», «в извлечённых данных», «в фактах», «в данных по странице». Говори про САЙТ: «на сайте /
  на странице / на скрине не видно».
- Язык владельца, без тех-жаргона. ЗАПРЕЩЕНО наружу: schema, schema.org, SiteNavigationElement, Organization/
  ImageObject/FAQPage/LodgingBusiness/Offer/ContactPoint и любые названия типов разметки, «lang», «серверный рендер»,
  «raw/rendered», «машиночитаемость», «когнитивное трение», «local-объект», «холодный/сравнительный трафик»,
  AEO, answer engines. Переводи: разметка/schema → «поисковики и нейросети хуже понимают, что у вас за бизнес»;
  «когнитивное трение» → «лишние шаги и путаница»; AEO/ИИ-видимость → «показываемся ли мы в нейропоиске
  (ChatGPT, Алиса, Яндекс Нейро)». Это касается и поля evidence: цитируй ВИДИМЫЙ элемент страницы
  (заголовок, кнопку, текст). Для нейропоиска и техники, где видимого элемента нет, описывай факт ПРОСТЫМИ
  словами: «на странице нет машиночитаемых данных о компании и товарах — только меню», «текст подгружается
  скриптами, поисковику виден не сразу» — но НЕ называй типы разметки и НЕ цитируй наши служебные строки.
  Описывай факт СВОИМИ словами — не копируй наши строки-факты дословно (без «указано: …», без переноса
  формулировок с двоеточием вроде «Машиночитаемые данные…: нет»).
- Не дублируй одну причину под разными заголовками. Одна проблема — одна находка (с разными проявлениями
  внутри текста), группируй. Пример: «цена не видна» — это ОДНА находка, не четыре.
- В «что работает» (severity ok) — то, что оценит владелец, человеческим языком: «оффер цепляет»,
  «кнопки на телефоне крупные», «понятно, что за место». Без тех-терминов.`;

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
     "conversion_impact":"high|medium|low","impact_estimate":"уровень риска словами (высокий/средний/низкий риск), без %, или null"}]}],
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

// Человеческое описание машиночитаемых данных (вместо сырых названий типов schema,
// чтобы модель не утекала «SiteNavigationElement» и пр. в evidence — фикс жаргона).
function aeoDataHuman(e: ExtractedData): string {
  if (!e.hasSchema) return "нет";
  const t = e.schemaTypes.map((s) => s.toLowerCase());
  const has = (...keys: string[]) => keys.some((k) => t.some((x) => x.includes(k)));
  const parts: string[] = [];
  if (has("organization", "localbusiness", "lodging", "restaurant", "store", "medical", "dentist", "hotel")) parts.push("о компании");
  if (has("product", "offer")) parts.push("о товарах и ценах");
  if (has("faqpage", "question")) parts.push("вопросы-ответы");
  if (parts.length === 0) return "только техническая разметка меню/навигации — данных о компании или товарах нет";
  return "есть данные " + parts.join(", ");
}

// Виден ли текст поисковику без JS — словами (вместо «raw/rendered: 1»).
function serverRenderHuman(ratio: number | null | undefined): string {
  if (ratio == null) return "неизвестно";
  if (ratio >= 0.6) return "да";
  if (ratio <= 0.2) return "нет, почти всё подгружается скриптами";
  return "частично";
}

/** Блок скорости только при реальных данных; иначе — запрет выдумывать (§8.1). */
function speedBlock(pagespeed: { mobile: PageSpeedMetrics | null; desktop: PageSpeedMetrics | null }): string[] {
  if (!pagespeed.mobile && !pagespeed.desktop) {
    return ["=== СКОРОСТЬ ===", "Данных о скорости нет. НЕ упоминай скорость и НЕ суди о ней по числу картинок."];
  }
  return ["=== СКОРОСТЬ (PageSpeed) ===", `Мобайл: ${ps(pagespeed.mobile)}`, `Десктоп: ${ps(pagespeed.desktop)}`];
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
    `Язык страницы указан: ${e.lang ? "да" : "нет"}`,
    `H1: ${e.headings.h1.join(" | ") || "нет"}`,
    `H2: ${e.headings.h2.slice(0, 12).join(" | ") || "нет"}`,
    `H3: ${e.headings.h3.slice(0, 12).join(" | ") || "нет"}`,
    `Кнопки/CTA: ${e.buttons.slice(0, 20).join(" | ") || "нет"}`,
    `Формы (число полей): ${e.forms.map((f) => f.fieldCount).join(", ") || "нет форм"}`,
    `Телефон: ${e.phone ?? "не найден"}`,
    `Картинок: ${e.imageCount}, видео: ${e.videoCount}`,
    "",
    ...speedBlock(ctx.pagespeed),
    "",
    "=== ВИДНЫ ЛИ ВЫ В НЕЙРОПОИСКЕ (факты для анализа) ===",
    `Машиночитаемые данные о бизнесе для нейропоиска: ${aeoDataHuman(e)}`,
    `Эти данные видны поисковику сразу, без JS: ${ctx.aeo.hasSchemaInRaw ? "да" : "нет"}`,
    `Основной текст страницы виден поисковику без JS: ${serverRenderHuman(ctx.aeo.serverRenderedRatio)}`,
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
