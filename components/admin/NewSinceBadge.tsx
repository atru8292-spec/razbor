"use client";

import { useEffect, useState } from "react";

// Бейдж «N новых заявок с прошлого захода» (часть F). «Прошлый заход» = момент, когда
// хозяйка ушла со страницы (пишем в localStorage на размонтировании). Автообновление
// не размонтирует компонент → бейдж копит новые в реальном времени, не сбрасываясь.
const KEY = "admin_last_seen";

export default function NewSinceBadge({ timestamps }: { timestamps: string[] }) {
  const [count, setCount] = useState<number | null>(null);

  // пересчёт при каждом обновлении данных (новые timestamps приходят пропсом)
  useEffect(() => {
    const last = localStorage.getItem(KEY);
    const lastMs = last ? new Date(last).getTime() : Date.now();
    setCount(timestamps.filter((t) => new Date(t).getTime() > lastMs).length);
  }, [timestamps]);

  // ушла со страницы → запоминаем время как «прошлый заход»
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(KEY, new Date().toISOString());
      } catch {
        /* приватный режим — игнорируем */
      }
    };
  }, []);

  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-oxblood px-3 py-1 font-sans text-xs font-medium text-paper">
      <span className="h-1.5 w-1.5 rounded-full bg-paper" />
      {count} {count === 1 ? "новая заявка" : "новых"} с прошлого захода
    </span>
  );
}
