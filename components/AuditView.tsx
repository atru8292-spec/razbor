"use client";

import { useState } from "react";
import type { AuditResult, AuditTeaser, Finding, Area } from "@/lib/audit-types";
import { SEVERITY, type Severity } from "./ui/severity";
import ScoreGauge from "./ui/ScoreGauge";
import LiftRadar from "./ui/LiftRadar";
import Tag from "./ui/Tag";
import HeroRedesign from "./HeroRedesign";

const OWNER_CONTACT = process.env.NEXT_PUBLIC_OWNER_CONTACT || "https://t.me/arinashrr";

export interface Screenshots {
  desktop?: { base64: string; width: number; height: number };
  mobile?: { base64: string; width: number; height: number };
  competitors?: { url: string; name: string; base64: string }[];
  fragments?: { base64: string }[];
}

const dataUrl = (b64: string) => `data:image/jpeg;base64,${b64}`;
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const plural = (n: number) => `${n} ${n === 1 ? "находка" : n >= 2 && n <= 4 ? "находки" : "находок"}`;
const sevRank = (s: string) => (s === "high" ? 3 : s === "medium" ? 2 : s === "low" ? 1 : 0);

// Промежуточный CTA (единственный, после топ-3).
function CtaInline() {
  return (
    <div className="mt-8 flex flex-col items-start gap-3 border-y-2 border-oxblood/20 py-5 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-sans text-base text-ink">Уже видно, где утечки. Обсудим, как починить?</span>
      <a
        href={OWNER_CONTACT}
        target="_blank"
        rel="noopener"
        className="shrink-0 bg-oxblood px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep"
      >
        Обсудить редизайн
      </a>
    </div>
  );
}

// ─── Блок A: резюме (бесплатно) ───
export function Teaser({ teaser }: { teaser: AuditTeaser }) {
  const [first, ...rest] = teaser.verdict.split(/(?<=[.!?])\s+/);
  const restText = rest.join(" ");

  return (
    <section>
      <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <ScoreGauge label="Итог" value={teaser.overall_score} />
        <ScoreGauge label="Конверсия" value={teaser.conversion_score} />
        <ScoreGauge label="Удобство" value={teaser.usability_score} />
        <ScoreGauge label="ИИ-видимость" value={teaser.aeo_score} />
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-[1fr_320px] md:items-start lg:gap-16">
        <div>
          <Tag>Главная утечка</Tag>
          <p className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-[1.05] text-ink sm:text-4xl">{first}</p>
          {restText && <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-ink-soft">{restText}</p>}
        </div>
        <div className="justify-self-center">
          <LiftRadar lift={teaser.lift} />
        </div>
      </div>

      {teaser.top_priorities.length > 0 && (
        <div className="mt-16">
          <Tag>Топ-3 точки потери</Tag>
          <ol className="mt-5 divide-y divide-line border-y border-line">
            {teaser.top_priorities.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-baseline gap-5 py-5">
                <span className="font-display text-3xl font-black leading-none text-oxblood sm:text-4xl">{i + 1}</span>
                <span className="font-sans text-lg leading-snug text-ink">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <CtaInline />
    </section>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const s = SEVERITY[f.severity as Severity] ?? SEVERITY.medium;
  return (
    <div className="py-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        <span className={`font-display text-[10px] font-bold uppercase tracking-widest ${s.text}`}>{s.label}</span>
        <span className="font-sans font-semibold text-ink">{f.finding}</span>
      </div>
      {f.why_it_hurts && <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{f.why_it_hurts}</p>}
      {f.evidence && <p className="mt-2 bg-paper-2 px-3 py-2 font-sans text-xs italic text-ink-soft">{f.evidence}</p>}
      {f.impact_estimate && <p className="mt-2 font-sans text-xs font-semibold uppercase tracking-wide text-oxblood">{f.impact_estimate}</p>}
    </div>
  );
}

// ─── Блок C: направление-аккордеон ───
function AreaAccordion({ area, forceOpen }: { area: Area; forceOpen: boolean }) {
  const leaks = (area.findings ?? []).filter((f) => f.severity !== "ok").sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
  const [open, setOpen] = useState(forceOpen);
  const low = area.score < 55;

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-display text-lg font-extrabold text-ink transition-colors group-hover:text-oxblood sm:text-xl">
          {area.title}
        </span>
        <span className="flex items-center gap-3 sm:gap-5">
          <span className={`font-sans text-xs font-semibold ${leaks.length ? "text-oxblood" : "text-ink-soft"}`}>
            {leaks.length ? plural(leaks.length) : "без проблем"}
          </span>
          <span className={`font-display text-2xl font-black leading-none ${low ? "text-oxblood" : "text-ink"}`}>{area.score}</span>
          <span className="flex shrink-0 items-center gap-1.5 text-ink-soft transition-colors group-hover:text-oxblood">
            <span className="hidden font-sans text-xs uppercase tracking-wide sm:inline">{open ? "свернуть" : "развернуть"}</span>
            <svg
              className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {/* Вступление для нейропоиска — объясняем, о чём речь, тем кто не в теме (#7) */}
          {area.key === "aeo" && (
            <p className="max-w-2xl py-4 font-sans text-[0.95rem] leading-relaxed text-ink-soft">
              Люди всё чаще спрашивают не поисковик, а нейросеть: «посоветуй, где заказать / куда сходить». Нейросеть
              читает сайты и советует те, что поняла. Если ваш сайт ей непонятен — вас не порекомендуют, и клиент уходит
              к конкуренту, даже не дойдя до вас.
            </p>
          )}
          <div className="divide-y divide-line pb-2">
            {leaks.length ? leaks.map((f, i) => <FindingCard key={i} f={f} />) : <p className="py-4 font-sans text-sm text-ink-soft">Серьёзных проблем не нашли.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const EFFORT_LABEL: Record<string, string> = { low: "быстро", medium: "средне", high: "долго" };

// ─── Блок D: аннотированный скрин ───
function AnnotatedShot({ screenshots, leaks, print }: { screenshots: Screenshots; leaks: Finding[]; print: boolean }) {
  const frags = screenshots.fragments?.length ? screenshots.fragments : screenshots.desktop ? [{ base64: screenshots.desktop.base64 }] : [];
  if (frags.length === 0 && leaks.length === 0) return null;
  return (
    <section className="mt-24">
      <Tag>Ключевые точки потери</Tag>
      <div className={`mt-5 grid gap-6 ${print ? "" : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"}`}>
        {!print && frags.length > 0 && (
          <div className="space-y-3">
            {frags.map((f, i) => (
              <div key={i} className="border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl(f.base64)} alt={i === 0 ? "Первый экран" : "Середина страницы"} className="w-full" />
              </div>
            ))}
          </div>
        )}
        <ol className="space-y-4">
          {leaks.slice(0, 6).map((f, i) => {
            const s = SEVERITY[f.severity as Severity] ?? SEVERITY.medium;
            return (
              <li key={i} className="flex gap-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.dot} font-display text-xs font-bold text-paper`}>{i + 1}</span>
                <div>
                  <p className="font-sans font-medium text-ink">{f.finding}</p>
                  {f.impact_estimate && <p className="mt-0.5 font-sans text-xs font-semibold uppercase tracking-wide text-oxblood">{f.impact_estimate}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── Блок E: финальный CTA (full-bleed оксблад) ───
function FinalCta() {
  return (
    <section className="mt-24 bg-oxblood px-8 py-16 text-center">
      <h2 className="font-display text-3xl font-black text-paper sm:text-4xl">Хотите, чтобы это починили?</h2>
      <p className="mx-auto mt-4 max-w-md font-sans text-paper/80">
        Соберу план правок под ваш сайт — 20 минут, бесплатно. Напишите, договоримся.
      </p>
      <a
        href={OWNER_CONTACT}
        target="_blank"
        rel="noopener"
        className="mt-7 inline-block bg-paper px-8 py-4 font-display text-sm font-bold uppercase tracking-wide text-oxblood transition hover:bg-paper-2"
      >
        Обсудить редизайн
      </a>
    </section>
  );
}

export function FullReport({
  result,
  screenshots,
  auditId,
  print = false,
}: {
  result: AuditResult;
  screenshots: Screenshots;
  auditId: string;
  print?: boolean;
}) {
  const all = (result.areas ?? []).flatMap((a) => a.findings ?? []);
  const strengths = all.filter((f) => f.severity === "ok");
  const leaks = all.filter((f) => f.severity !== "ok").sort((a, b) => sevRank(b.severity) - sevRank(a.severity));

  return (
    <div className="mt-24">
      {/* Демо-переделка первого экрана — сразу после главной утечки (проблема → решение → детали) */}
      {!print && <HeroRedesign auditId={auditId} />}

      {strengths.length > 0 && (
        <section className="mt-24">
          <Tag>Что работает</Tag>
          <ul className="mt-5 space-y-3">
            {strengths.map((f, i) => (
              <li key={i} className="flex gap-3 font-sans text-ink">
                <span className="font-display font-black text-dusty-blue">✓</span>
                {f.finding}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-24">
        <Tag>Разбор по направлениям</Tag>
        <div className="mt-5 border-t border-line">
          {(result.areas ?? []).map((area, i) => (
            <AreaAccordion key={area.key} area={area} forceOpen={print || i === 0} />
          ))}
        </div>
      </section>

      <AnnotatedShot screenshots={screenshots} leaks={leaks} print={print} />

      {(result.competitor_gaps?.length > 0 || (screenshots.competitors?.length ?? 0) > 0) && (
        <section className="mt-24">
          <Tag>Конкуренты</Tag>
          {screenshots.competitors && screenshots.competitors.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {screenshots.competitors.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener" className="group block border border-line bg-white">
                  <div className="h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dataUrl(c.base64)} alt={c.name} className="w-full" />
                  </div>
                  <div className="border-t border-line px-3 py-2 font-sans text-xs text-ink-soft group-hover:text-oxblood">{hostOf(c.url)}</div>
                </a>
              ))}
            </div>
          )}
          {result.competitor_gaps?.length > 0 && (
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {result.competitor_gaps.map((g, i) => (
                <li key={i} className="py-4 font-sans text-ink">
                  <span className="font-semibold">{g.missing}</span> — <span className="text-ink-soft">{g.impact}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {result.detailed_fixes?.length > 0 && (
        <section className="mt-24">
          <Tag>План правок</Tag>
          <ol className="mt-5 divide-y divide-line border-y border-line">
            {result.detailed_fixes.map((fix, i) => (
              <li key={i} className="flex items-baseline gap-5 py-5">
                <span className="font-display text-2xl font-black leading-none text-oxblood">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-sans font-semibold text-ink">{fix.fix}</p>
                  <p className="font-sans text-sm text-ink-soft">{fix.expected_effect}</p>
                </div>
                <span className="shrink-0 border border-line px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-ink-soft">
                  {EFFORT_LABEL[fix.effort] ?? fix.effort}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!print && <FinalCta />}
    </div>
  );
}
