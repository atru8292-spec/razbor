"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Реал-тайм без сокетов (часть F): тихо дёргает router.refresh() раз в intervalMs
// (RSC перечитывается, страница не мигает) + показывает «обновлено N назад» и кнопку.
export default function RefreshBar({ serverTime, intervalMs = 60000 }: { serverTime: string; intervalMs?: number }) {
  const router = useRouter();
  const [, setTick] = useState(0);

  // тикаем раз в секунду, чтобы счётчик «N назад» шёл
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // автообновление
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);

  const secs = Math.max(0, Math.round((Date.now() - new Date(serverTime).getTime()) / 1000));
  const ago = secs < 60 ? `${secs} сек назад` : `${Math.round(secs / 60)} мин назад`;

  return (
    <div className="flex items-center gap-2 font-sans text-xs text-espresso/45">
      <span aria-live="polite">обновлено {ago}</span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="border border-espresso/20 px-2 py-0.5 text-espresso/60 transition-colors hover:border-oxblood/50 hover:text-oxblood"
      >
        Обновить
      </button>
    </div>
  );
}
