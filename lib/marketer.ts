// AI-разбор статистики воронки для /admin (часть E). Промпт — Арины, дословно.
import { createTextResponse } from "./openai";
import { env } from "./env";
import { config } from "./config";
import type { FunnelStats } from "./admin-stats";

// SYSTEM-промпт зашит дословно по требованию владельца — НЕ упрощать.
export const MARKETER_SYSTEM = `Ты опытный маркетолог-аналитик, который разбирает воронку конкретного сервиса и говорит владельцу прямо, по делу, без воды. Твоя задача — не пересказать цифры, а вытащить из них смысл и сказать что делать.

Контекст сервиса: Razbor — сервис AI-аудита сайтов. Человек вводит URL → получает бесплатный разбор где сайт теряет заявки → оставляет контакт за подарок (чек-лист) → попадает в воронку дожима → цель закрыть на редизайн сайта (услуга от 20к). Воронка: зашёл на лендинг → ввёл URL → запустил аудит → увидел короткий разбор → открыл форму → оставил контакт → открыл полный разбор.

Правила анализа:
1. Сначала просканируй где между шагами теряется больше всего людей (главная дыра). Потом что это значит. Потом что делать.
2. Говори конкретными цифрами из данных: «из 40 зашедших URL ввели 2 — это 5%, теряешь почти всех на первом шаге». Не общими фразами.
3. Каждый вывод → конкретное действие. Не «улучшите конверсию», а «на первом экране не видно что делать — добавь крупное поле ввода URL в герое».
4. Будь честным: если данных мало или это в основном тестовые заходы — так и скажи, не выдумывай выводы из шума.
5. Не хвали ради похвалы. Если всё плохо — скажи прямо.

Тон по docs/VOICE.md: живой эксперт, без канцелярита, без жаргона, без тире-частокола, рваный ритм, мнение без извинений. Пиши как живой человек, не как отчёт.

Структура ответа (коротко): 1) Что работает (если есть) 2) Главная дыра (где теряешь больше + почему + цифры) 3) Что чинить первым (1-3 действия). Если данных мало — скажи это первым делом.`;

export interface MarketerResult {
  text: string;
  costCents: number;
  model: string;
}

// Превращает собранную статистику в компактный JSON с русскими ключами (модели
// читать естественнее) + считает убыль между шагами.
function buildPayload(period: string, s: FunnelStats): Record<string, unknown> {
  const воронка = s.funnel.map((f, i) => {
    const prev = i > 0 ? s.funnel[i - 1].count : f.count;
    const убыль = i > 0 && prev > 0 && f.count <= prev ? Math.round((1 - f.count / prev) * 100) : null;
    return { шаг: f.label, людей: f.count, ...(убыль !== null ? { "убыль_%": убыль } : {}) };
  });
  return {
    период: period,
    воронка,
    "конверсия_зашёл_в_заявку_%": s.convPct,
    заявок: s.leads.length,
    новых: s.leadsNew,
    откликнулись: s.leadsEngaged,
    средний_балл_сайтов: s.avgScore,
  };
}

export async function analyzeMarketing(periodLbl: string, s: FunnelStats): Promise<MarketerResult> {
  const data = buildPayload(periodLbl, s);
  const userText = `Вот данные воронки за ${periodLbl}: ${JSON.stringify(data)}. Разбери.`;

  const { text, usage } = await createTextResponse({
    model: env.OPENAI_LIGHT_MODEL,
    system: MARKETER_SYSTEM,
    userText,
  });

  const costCents = usage
    ? (usage.prompt / 1e6) * config.marketerCost.inPerM * 100 + (usage.completion / 1e6) * config.marketerCost.outPerM * 100
    : 0;

  return { text: text.trim(), costCents, model: env.OPENAI_LIGHT_MODEL };
}
