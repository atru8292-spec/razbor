import { scoreColor } from "./severity";

// Шкала оценки 0-100: крупное число + тонкий бар. Editorial, без «миленьких» дуг.
export default function ScoreGauge({
  label,
  value,
  big = false,
}: {
  label: string;
  value: number;
  big?: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="border border-espresso/12 bg-white px-4 py-4">
      <div className={`font-display font-bold leading-none text-espresso ${big ? "text-5xl" : "text-4xl"}`}>
        {v}
        <span className="text-base font-normal text-espresso/30">/100</span>
      </div>
      <div className="mt-3 h-1.5 w-full bg-espresso/10">
        <div className={`h-full ${scoreColor(v)}`} style={{ width: `${v}%` }} />
      </div>
      <div className="mt-2 font-display text-[11px] uppercase tracking-[0.18em] text-espresso/60">{label}</div>
    </div>
  );
}
