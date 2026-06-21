// Демо-переделка первого экрана (HERO-REDESIGN.md). Переиспользуем готовый аудит —
// НЕ анализируем заново. Один vision-вызов: видит скрин текущего хиро + находки,
// возвращает новый HTML/CSS + объяснения. Промпт-дизайнер зашит ДОСЛОВНО.
import { createJsonResponse, extractJson } from "./openai";
import { env } from "./env";
import { config } from "./config";
import type { AuditResult } from "./audit-types";

// SYSTEM-промпт — дословно из docs/HERO-REDESIGN.md, не упрощать.
export const HERO_SYSTEM = `Ты сильный веб-дизайнер и CRO-эксперт. Тебе дают первый экран сайта и находки
аудита по нему. Задача — переделать первый экран так, чтобы он лучше продавал и
приводил к заявке, и объяснить каждое решение простым языком для владельца.

КАК ДУМАТЬ (по порядку):
1. Сначала пойми: что за бизнес, кто клиент, какое целевое действие.
2. Посмотри находки аудита — что конкретно не так с текущим первым экраном.
3. Переделай, закрывая эти проблемы, по правилам ниже.
4. Объясни каждое ключевое изменение: что было плохо → что сделал → почему лучше.

ПРАВИЛА ХОРОШЕГО ПЕРВОГО ЭКРАНА (делать так):
- Заголовок про ВЫГОДУ клиента и результат, не «мы команда профессионалов».
  Понятно за 5 секунд: что это, кому, какая польза.
- Один понятный главный CTA, кнопка говорит результат («Получить расчёт»),
  не «Отправить».
- Подзаголовок объясняет суть/механизм коротко.
- Видно доверие сразу если уместно (цифры, факты — без выдумок).
- Чистая визуальная иерархия: главное крупно, путь взгляда ясный.
- Мобайл: один экран, ничего не съезжает, кнопка видна без прокрутки.

ЗАПРЕТЫ (НЕ делать — это AI-слоп):
- НЕ фиолетово-синий градиент (#a855f7→#3b82f6) — главный маркер слопа.
- НЕ Inter/Roboto/Arial. Шрифты с характером (но web-safe или Google Fonts
  ссылкой, чтоб превью отрендерилось).
- НЕ три одинаковые карточки, не центрировать всё подряд.
- НЕ эмодзи как иконки, не ракеты, не блобы, не generic-тени.
- НЕ «Welcome to», «Empowering your journey», воду и клише.
- НЕ выдумывать факты/цифры/отзывы которых нет у клиента.

УЧИТЫВАЙ КОНТЕКСТ:
- Сохрани суть бизнеса и реальные данные клиента (название, услуги, контакты).
- Не выдумывай предложения которых нет. Улучшай подачу того что есть.
- Стиль адекватный нише (стоматология ≠ глэмпинг ≠ магазин).

ФОРМАТ ОТВЕТА (строго):
Верни JSON:
{
  "html": "<секция первого экрана: семантичный HTML с инлайн-CSS или <style>,
           самодостаточный, рендерится в iframe, адаптивный, по правилам выше>",
  "changes": [
    {"было": "...", "стало": "...", "почему": "простым языком зачем так лучше"},
    ... 3-5 ключевых изменений
  ]
}

Тон объяснений по docs/VOICE.md — живой эксперт, без жаргона, по делу.
Объяснения — это продажа экспертизы, делай их понятными и убедительными.`;

export interface HeroChange {
  было: string;
  стало: string;
  почему: string;
}

export interface HeroRedesignResult {
  html: string;
  changes: HeroChange[];
  costCents: number;
  model: string;
}

function buildUser(result: AuditResult): string {
  const hero = (result.areas ?? []).find((a) => a.key === "hero");
  const findings = (hero?.findings ?? [])
    .filter((f) => f.severity !== "ok")
    .map((f) => `- ${f.finding} (почему мешает: ${f.why_it_hurts}; на странице: ${f.evidence})`)
    .join("\n");
  const action = result.goal?.trim() || "оставить заявку / совершить целевое действие сайта";
  return [
    `Бизнес: тип «${result.site_type}». Целевое действие: ${action}.`,
    `Текущий первый экран — на приложенном скриншоте. Используй то, что на нём видно: заголовок, кнопки, реальное название и услуги бизнеса (не выдумывай).`,
    `Находки аудита по первому экрану:`,
    findings || "(существенных проблем по первому экрану не выделено — улучшай подачу того, что есть)",
    `Главная утечка сайта (контекст): ${result.verdict}`,
    `Переделай первый экран и объясни.`,
  ].join("\n");
}

export async function generateHeroRedesign(result: AuditResult, screenshotB64: string | null): Promise<HeroRedesignResult> {
  const { text, usage } = await createJsonResponse({
    model: env.OPENAI_VISION_MODEL,
    system: HERO_SYSTEM,
    userText: buildUser(result),
    imagesB64: screenshotB64 ? [screenshotB64] : [],
  });

  const parsed = extractJson(text) as { html?: unknown; changes?: unknown };
  const html = typeof parsed.html === "string" ? parsed.html : "";
  const changes = Array.isArray(parsed.changes)
    ? (parsed.changes as HeroChange[])
        .filter((c) => c && typeof c === "object")
        .slice(0, 6)
    : [];

  const costCents = usage
    ? (usage.prompt / 1e6) * config.heroRedesignCost.inPerM * 100 + (usage.completion / 1e6) * config.heroRedesignCost.outPerM * 100
    : 0;

  return { html, changes, costCents, model: env.OPENAI_VISION_MODEL };
}
