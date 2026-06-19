"use client";

import Tag from "./ui/Tag";

// Экран ожидания с предвкушением (раздел 13.3): этапы + живое превью скриншота.
const STAGES = [
  { match: "Снимаю сайт", label: "Снимаем сайт" },
  { match: "тип", label: "Определяем тип" },
  { match: "скорость", label: "Считаем скорость" },
  { match: "онкурент", label: "Ищем конкурентов" },
  { match: "Анализ", label: "Анализируем выдачу" },
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

  return (
    <div className="mt-12 grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
      <div>
        <Tag>Идёт разбор</Tag>
        <h1 className="mt-3 font-display text-3xl font-bold text-espresso">Проверяем сайт…</h1>
        {url && <p className="mt-1 font-sans text-sm text-espresso/50">{url}</p>}

        <ol className="mt-8 space-y-3">
          {STAGES.map((s, i) => {
            const state = i < active ? "done" : i === active ? "active" : "pending";
            return (
              <li key={i} className="flex items-center gap-3">
                <span
                  className={
                    state === "done"
                      ? "h-2.5 w-2.5 rounded-full bg-oxblood"
                      : state === "active"
                        ? "h-2.5 w-2.5 animate-pulse rounded-full bg-oxblood"
                        : "h-2.5 w-2.5 rounded-full border border-espresso/30"
                  }
                />
                <span className={`font-sans text-sm ${state === "pending" ? "text-espresso/40" : "text-espresso"}`}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 font-sans text-xs text-espresso/45">Обычно занимает пару минут. Можно не закрывать страницу.</p>
      </div>

      <div className="w-full max-w-[280px] justify-self-center">
        <Tag>Ваш сайт</Tag>
        <div className="mt-2 aspect-[3/4] overflow-hidden border border-espresso/15 bg-white">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpeg;base64,${preview}`} alt="Превью сайта" className="w-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-espresso/20 border-t-oxblood" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
