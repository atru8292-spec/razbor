// Лимиты и предохранители (разделы 10, 14, 15 ТЗ). Все значения — в одном месте,
// чтобы легко менять. На Шаге 1 это дефолты; используются на следующих шагах.
export const config = {
  // Лимит: один бесплатный аудит на контакт в месяц (раздел 10).
  freeAuditWindowDays: 30,
  freeAuditsPerContact: 1,

  // Дневные предохранители (раздел 14/15).
  maxAuditsPerDay: 100,
  maxIpAuditsPerDay: 5,
  dailyBudgetUsd: 20,

  // Конкуренты жёстко 3–5 (раздел 9, дисциплина по деньгам).
  minCompetitors: 3,
  maxCompetitors: 5,

  // Кэш результата по URL ненадолго (раздел 15).
  resultCacheMinutes: 60,

  // Follow-up: касания по дням (раздел 12).
  followupDays: [0, 2, 6] as const,

  // Воркер аудитов.
  worker: {
    pollIntervalMs: 4000, // как часто опрашивать pending-задачи в простое
    pagespeedTimeoutMs: 30_000,
  },

  // Скрины перед vision — уменьшаем, чтобы не жечь токены (раздел 15).
  visionImage: {
    desktopWidth: 1000,
    mobileWidth: 600,
    maxHeight: 5000, // обрезаем верхней частью: первый экран + структура видны
    jpegQuality: 72,
  },
} as const;

export type AppConfig = typeof config;
