import { scoreColor } from "./severity";
import CountUp from "./CountUp";

// Оценка brutalism (§2.3): огромное число Unbounded 900, «/100» мелко, бар 2px,
// лейбл-тег под числом. Без рамок-боксов — разделение линиями в контейнере.
export default function ScoreGauge({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="px-5 py-2">
      <div className="font-display font-black leading-none text-ink" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
        <CountUp value={v} />
        <span className="ml-0.5 font-sans text-sm font-normal text-ink/30">/100</span>
      </div>
      <div className="mt-3 h-0.5 w-full bg-line">
        <div className={`h-full ${scoreColor(v)}`} style={{ width: `${v}%` }} />
      </div>
      <div className="mt-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">{label}</div>
    </div>
  );
}
