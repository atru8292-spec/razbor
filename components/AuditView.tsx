"use client";

import type { AuditResult, AuditTeaser, Finding } from "@/lib/audit-types";
import { SEVERITY, type Severity } from "./ui/severity";
import ScoreGauge from "./ui/ScoreGauge";
import LiftRadar from "./ui/LiftRadar";
import Tag from "./ui/Tag";

export interface Screenshots {
  desktop?: { base64: string; width: number; height: number };
  mobile?: { base64: string; width: number; height: number };
  competitors?: { url: string; name: string; base64: string }[];
  fragments?: { base64: string }[];
}

const OWNER_CONTACT = process.env.NEXT_PUBLIC_OWNER_CONTACT || "https://t.me/arinashrr";

function dataUrl(b64: string): string {
  return `data:image/jpeg;base64,${b64}`;
}

// Компактный CTA на эксперта — ставим после вердикта и после находок (Шаг 10).
function ExpertCtaInline({ text = "Хотите, чтобы это починили?" }: { text?: string }) {
  return (
    <div className="mt-6 flex flex-col items-start gap-3 border border-oxblood/25 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-sans text-sm text-espresso/80">{text}</span>
      <a
        href={OWNER_CONTACT}
        target="_blank"
        rel="noopener"
        className="shrink-0 rounded-md bg-oxblood px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wide text-paper transition hover:opacity-90"
      >
        Обсудить редизайн
      </a>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─── Тизер (бесплатно): оценки, вердикт, радар, приоритеты ───
export function Teaser({ teaser }: { teaser: AuditTeaser }) {
  return (
    <section>
      <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <ScoreGauge label="Итог" value={teaser.overall_score} />
        <ScoreGauge label="Конверсия" value={teaser.conversion_score} />
        <ScoreGauge label="Удобство" value={teaser.usability_score} />
        <ScoreGauge label="ИИ-видимость" value={teaser.aeo_score} />
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <Tag>Главная утечка</Tag>
          <p className="mt-3 font-display text-2xl font-semibold leading-snug text-espresso">{teaser.verdict}</p>
          {teaser.top_priorities.length > 0 && (
            <ol className="mt-6 space-y-3">
              {teaser.top_priorities.map((p, i) => (
                <li key={i} className="flex gap-3 border-l-2 border-oxblood pl-4 font-sans text-espresso/90">
                  <span className="font-display font-bold text-oxblood">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          )}
          <ExpertCtaInline text="Уже видно, где утечки. Обсудим, как починить?" />
        </div>
        <div className="justify-self-center">
          <Tag>Силы LIFT</Tag>
          <div className="mt-2">
            <LiftRadar lift={teaser.lift} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Аннотированный скриншот: фрагменты (верх+середина) + нумерованная легенда ───
function AnnotatedShot({ screenshots, leaks, print = false }: { screenshots: Screenshots; leaks: Finding[]; print?: boolean }) {
  const frags = screenshots.fragments?.length ? screenshots.fragments : screenshots.desktop ? [{ base64: screenshots.desktop.base64 }] : [];
  if (frags.length === 0 && leaks.length === 0) return null;
  const legend = leaks.slice(0, 6);
  return (
    <section className="mt-14">
      <Tag>Ключевые точки потери</Tag>
      <div className={`mt-4 grid gap-6 ${print ? "" : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"}`}>
        {!print && frags.length > 0 && (
          <div className="space-y-2">
            {frags.map((f, i) => (
              <div key={i} className="border border-espresso/15 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl(f.base64)} alt={i === 0 ? "Первый экран" : "Середина страницы"} className="w-full" />
              </div>
            ))}
          </div>
        )}
        <ol className="space-y-4">
          {legend.map((f, i) => {
            const s = SEVERITY[f.severity as Severity] ?? SEVERITY.medium;
            return (
              <li key={i} className="flex gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.dot} font-display text-xs font-bold text-paper`}>
                  {i + 1}
                </span>
                <div>
                  <p className="font-sans font-medium text-espresso">{f.finding}</p>
                  {f.impact_estimate && <p className="mt-0.5 font-sans text-xs text-oxblood">{f.impact_estimate}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const s = SEVERITY[f.severity as Severity] ?? SEVERITY.medium;
  return (
    <div className="border border-espresso/12 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        <span className={`font-display text-[10px] font-bold uppercase tracking-widest ${s.text}`}>{s.label}</span>
        <span className="font-sans font-medium text-espresso">{f.finding}</span>
      </div>
      {f.why_it_hurts && <p className="mt-2 font-sans text-sm text-espresso/75">{f.why_it_hurts}</p>}
      {f.evidence && <p className="mt-1 font-sans text-xs italic text-espresso/55">{f.evidence}</p>}
      {f.impact_estimate && <p className="mt-1 font-sans text-xs text-oxblood">Потери: {f.impact_estimate}</p>}
    </div>
  );
}

const EFFORT_LABEL: Record<string, string> = { low: "быстро", medium: "средне", high: "долго" };

// ─── Полный разбор (после контакта): тон «хорошо → дыры → план» ───
export function FullReport({ result, screenshots, print = false }: { result: AuditResult; screenshots: Screenshots; print?: boolean }) {
  const allFindings = (result.areas ?? []).flatMap((a) => a.findings ?? []);
  const strengths = allFindings.filter((f) => f.severity === "ok");
  const leaks = allFindings
    .filter((f) => f.severity !== "ok")
    .sort((a, b) => sevRank(b.severity) - sevRank(a.severity));

  return (
    <div className="mt-12">
      <AnnotatedShot screenshots={screenshots} leaks={leaks} print={print} />

      {strengths.length > 0 && (
        <section className="mt-14">
          <Tag>Что работает</Tag>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {strengths.map((f, i) => (
              <li key={i} className="flex gap-2 border-l-2 border-dusty-blue pl-3 font-sans text-sm text-espresso/85">
                {f.finding}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <Tag>Где теряются заявки</Tag>
        <div className="mt-4 space-y-8">
          {(result.areas ?? []).map((area) => {
            const leaksHere = (area.findings ?? []).filter((f) => f.severity !== "ok");
            if (leaksHere.length === 0) return null;
            return (
              <div key={area.key}>
                <h3 className="font-display text-lg font-semibold text-espresso">
                  {area.title} <span className="font-normal text-espresso/35">· {area.score}</span>
                </h3>
                <div className="mt-3 grid gap-3">
                  {leaksHere.map((f, i) => (
                    <FindingCard key={i} f={f} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(result.competitor_gaps?.length > 0 || (screenshots.competitors?.length ?? 0) > 0) && (
        <section className="mt-14">
          <Tag>Конкуренты</Tag>
          {screenshots.competitors && screenshots.competitors.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {screenshots.competitors.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener" className="group block border border-espresso/15 bg-white">
                  <div className="h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dataUrl(c.base64)} alt={c.name} className="w-full" />
                  </div>
                  <div className="border-t border-espresso/10 px-3 py-2 font-sans text-xs text-espresso/70 group-hover:text-oxblood">
                    {hostOf(c.url)}
                  </div>
                </a>
              ))}
            </div>
          )}
          {result.competitor_gaps?.length > 0 && (
            <ul className="mt-5 space-y-2">
              {result.competitor_gaps.map((g, i) => (
                <li key={i} className="border border-espresso/12 bg-white p-3 font-sans text-sm text-espresso/85">
                  <span className="font-medium text-espresso">{g.missing}</span> — {g.impact}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {result.detailed_fixes?.length > 0 && (
        <section className="mt-14">
          <Tag>План правок</Tag>
          <div className="mt-4 divide-y divide-espresso/10 border border-espresso/12 bg-white">
            {result.detailed_fixes.map((fix, i) => (
              <div key={i} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="sm:pr-6">
                  <p className="font-sans font-medium text-espresso">{fix.fix}</p>
                  <p className="font-sans text-xs text-espresso/60">{fix.expected_effect}</p>
                </div>
                <span className="shrink-0 self-start border border-espresso/20 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-navy">
                  {EFFORT_LABEL[fix.effort] ?? fix.effort}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function sevRank(s: string): number {
  return s === "high" ? 3 : s === "medium" ? 2 : s === "low" ? 1 : 0;
}
