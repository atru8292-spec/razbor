import { scoreColor } from "@/components/ui/severity";

// Карточка-пример разбора для первого экрана: показывает РЕЗУЛЬТАТ до клика
// (главный крючок). Статичный образец, честно помечен «пример». Цвет = смысл:
// бары направлений красятся по severity (оксблад → navy → пыльно-голубой),
// поверхность paper-2 — даёт цвет и ритм без слопа (BUILD-GUIDE).

const SAMPLE = {
  domain: "glamping-tula.ru",
  overall: 61,
  leakLead: "на первом экране ",
  leakAccent: "нет цены и условий брони",
  dirs: [
    { label: "Первый экран", score: 74 },
    { label: "Доверие", score: 58 },
    { label: "Путь к заявке", score: 41 },
  ],
  rest: "и ещё 5 направлений — до нейропоиска",
};

function Bar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-line">
      <div className={`h-full rounded-full ${scoreColor(score)}`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function HeroSample() {
  const s = SAMPLE;
  return (
    <div className="rounded-2xl border border-line bg-paper-2 p-6 shadow-[0_18px_50px_rgba(78,0,0,0.10)] sm:p-7">
      {/* шапка карточки */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
          Пример разбора
        </span>
        <span className="font-sans text-xs text-ink-soft">{s.domain}</span>
      </div>

      {/* общая оценка */}
      <div className="mt-5">
        <div className="flex items-end gap-3">
          <span className="font-display font-black leading-none text-ink" style={{ fontSize: "3.5rem" }}>
            {s.overall}
          </span>
          <span className="mb-2 font-sans text-sm text-ink/35">/100</span>
          <span className="mb-2 ml-auto font-sans text-xs font-bold uppercase tracking-[0.1em] text-navy">
            средний риск
          </span>
        </div>
        <div className="mt-3">
          <Bar score={s.overall} />
        </div>
      </div>

      {/* главная утечка — денежная мысль */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          ⚑ Главная утечка
        </p>
        <p className="mt-1.5 font-sans text-[0.95rem] leading-snug text-ink">
          {s.leakLead}
          <span className="font-semibold text-oxblood">{s.leakAccent}</span> — гость уходит сравнивать
          и не возвращается.
        </p>
      </div>

      {/* направления — разный цвет по серьёзности */}
      <div className="mt-5 space-y-3">
        {s.dirs.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-sans text-sm text-ink">{d.label}</span>
            <Bar score={d.score} />
            <span className="w-7 shrink-0 text-right font-display text-sm font-bold text-ink">{d.score}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 font-sans text-xs text-ink-soft">{s.rest}</p>
    </div>
  );
}
