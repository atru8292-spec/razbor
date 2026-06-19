"use client";

import type { AuditResult, AuditTeaser, LiftScores } from "@/lib/audit-types";

// Минимальный рендер выдачи (Шаг 3). Премиум-визуал (радар, severity-система,
// аннотированный скрин, матрица конкурентов) — Шаг 7.

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-espresso/15 bg-white px-4 py-3 text-center">
      <div className="font-display text-3xl font-bold text-oxblood">{value}</div>
      <div className="mt-1 font-sans text-xs uppercase tracking-wide text-espresso/60">{label}</div>
    </div>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "text-oxblood",
  medium: "text-navy",
  low: "text-espresso/60",
  ok: "text-dusty-blue",
};

function LiftRow({ lift }: { lift: LiftScores }) {
  const rows: [string, number][] = [
    ["Ценность", lift.value_prop],
    ["Релевантность", lift.relevance],
    ["Ясность", lift.clarity],
    ["Тревога", lift.anxiety],
    ["Отвлечение", lift.distraction],
    ["Срочность", lift.urgency],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between rounded border border-espresso/10 px-3 py-2">
          <span className="font-sans text-xs text-espresso/70">{k}</span>
          <span className="font-display text-sm font-semibold text-espresso">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function Teaser({ teaser }: { teaser: AuditTeaser }) {
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Score label="Итог" value={teaser.overall_score} />
        <Score label="Конверсия" value={teaser.conversion_score} />
        <Score label="Удобство" value={teaser.usability_score} />
        <Score label="ИИ-видимость" value={teaser.aeo_score} />
      </div>

      <p className="mt-6 font-display text-xl font-semibold leading-snug text-espresso">{teaser.verdict}</p>

      {teaser.top_priorities.length > 0 && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 font-sans text-espresso/85">
          {teaser.top_priorities.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      )}

      <div className="mt-6">
        <LiftRow lift={teaser.lift} />
      </div>
    </section>
  );
}

export function FullReport({ result }: { result: AuditResult }) {
  return (
    <section className="mt-10 space-y-8">
      {result.areas?.map((area) => (
        <div key={area.key}>
          <h3 className="font-display text-lg font-semibold text-espresso">
            {area.title} <span className="text-espresso/40">· {area.score}</span>
          </h3>
          <div className="mt-3 space-y-3">
            {area.findings?.map((f, i) => (
              <div key={i} className="rounded-md border border-espresso/10 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className={`font-display text-xs font-bold uppercase ${SEVERITY_COLOR[f.severity] ?? ""}`}>
                    {f.severity}
                  </span>
                  <span className="font-sans font-medium text-espresso">{f.finding}</span>
                </div>
                <p className="mt-2 font-sans text-sm text-espresso/75">{f.why_it_hurts}</p>
                {f.evidence && <p className="mt-1 font-sans text-xs italic text-espresso/55">{f.evidence}</p>}
                {f.impact_estimate && (
                  <p className="mt-1 font-sans text-xs text-oxblood">Оценка потерь: {f.impact_estimate}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {result.competitor_gaps?.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-espresso">Чего нет против конкурентов</h3>
          <ul className="mt-3 space-y-2">
            {result.competitor_gaps.map((g, i) => (
              <li key={i} className="rounded-md border border-espresso/10 bg-white p-3 font-sans text-sm text-espresso/80">
                <span className="font-medium text-espresso">{g.missing}</span> — {g.impact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.detailed_fixes?.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-espresso">План правок</h3>
          <ul className="mt-3 space-y-2">
            {result.detailed_fixes.map((fix, i) => (
              <li key={i} className="rounded-md border border-espresso/10 bg-white p-3 font-sans text-sm text-espresso/80">
                <span className="font-medium text-espresso">{fix.fix}</span>
                <span className="ml-2 text-xs text-navy">[{fix.effort}]</span>
                <span className="block text-xs text-espresso/60">{fix.expected_effect}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
