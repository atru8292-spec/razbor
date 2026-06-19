"use client";

import Tag from "./ui/Tag";

// Экран ожидания с предвкушением (§4): крупные этапы, линия-прогресс, превью, теги.
const STAGES = [
  { match: "Снимаю сайт", label: "Снимаем сайт" },
  { match: "тип", label: "Определяем тип" },
  { match: "скорость", label: "Считаем скорость" },
  { match: "онкурент", label: "Ищем конкурентов" },
  { match: "Анализ", label: "Анализируем выдачу" },
];

const CHECK_TAGS = [
  "Первый экран",
  "Ценность",
  "Структура",
  "Доверие",
  "Путь к заявке",
  "Мобайл",
  "Скорость",
  "ИИ-видимость",
];

function activeIndex(progress: string | null): number {
  if (!progress) return 0;
  const i = STAGES.findIndex((s) => progress.includes(s.match));
  return i === -1 ? 0 : i;
}

export default function WaitingScreen({
  progress,
  url,
  preview,
}: {
  progress: string | null;
  url?: string;
  preview?: string;
}) {
  const active = activeIndex(progress);
  const fillPct = STAGES.length > 1 ? (active / (STAGES.length - 1)) * 100 : 0;

  return (
    <div className="mt-12 grid gap-12 md:grid-cols-[1fr_360px] md:items-start">
      <div>
        <Tag>Идёт разбор</Tag>
        <h1 className="mt-4 font-display font-black leading-[0.95] text-ink" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
          Проверяем сайт…
        </h1>
        {url && <p className="mt-2 font-sans text-sm text-ink-soft">{url}</p>}

        {/* этапы с вертикальной линией-прогрессом */}
        <div className="relative mt-10 pl-8">
          <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-line" />
          <div className="absolute left-[7px] top-1 w-0.5 bg-oxblood transition-[height] duration-500" style={{ height: `calc(${fillPct}% )` }} />
          <ol className="space-y-6">
            {STAGES.map((s, i) => {
              const state = i < active ? "done" : i === active ? "active" : "pending";
              return (
                <li key={i} className="relative">
                  <span
                    className={
                      "absolute -left-8 top-1 block h-4 w-4 rounded-full border-2 " +
                      (state === "done"
                        ? "border-oxblood bg-oxblood"
                        : state === "active"
                          ? "border-oxblood bg-paper softpulse"
                          : "border-line bg-paper")
                    }
                  />
                  <span
                    className={
                      state === "active"
                        ? "font-display text-xl font-extrabold text-oxblood softpulse"
                        : state === "done"
                          ? "font-sans text-ink"
                          : "font-sans text-ink-soft/50"
                    }
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-10 font-sans text-sm text-ink-soft">Обычно пара минут — можно не закрывать страницу.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CHECK_TAGS.map((t) => (
            <span key={t} className="border border-line px-2.5 py-1 font-sans text-xs text-ink-soft">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full justify-self-center">
        <Tag>Ваш сайт</Tag>
        <div className="reveal is-in mt-3 aspect-[3/4] overflow-hidden border border-line bg-white">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpeg;base64,${preview}`} alt="Превью сайта" className="w-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-oxblood" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
