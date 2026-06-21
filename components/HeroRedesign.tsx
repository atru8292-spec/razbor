"use client";

import { useState } from "react";

// Демо-переделка первого экрана (HERO-REDESIGN.md). По клику — генерация из готового
// аудита, превью в sandboxed iframe (без скриптов), объяснения «было/стало/почему»,
// CTA к редизайну всего сайта. Кэш на сервере; «переделать заново» = ?force=1.
const OWNER = process.env.NEXT_PUBLIC_OWNER_CONTACT || "https://t.me/arinashrr";

interface Change {
  было?: string;
  стало?: string;
  почему?: string;
}

export default function HeroRedesign({ auditId }: { auditId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [html, setHtml] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [error, setError] = useState("");

  async function run(force = false) {
    setState("loading");
    setError("");
    try {
      const res = await fetch(`/api/audit/${auditId}/hero${force ? "?force=1" : ""}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не получилось переделать.");
        setState("error");
        return;
      }
      setHtml(data.html ?? "");
      setChanges(Array.isArray(data.changes) ? data.changes : []);
      setState("done");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setState("error");
    }
  }

  // Кнопка-призыв (отвечает на вопрос клиента «и что делать?»)
  if (state === "idle" || state === "error") {
    return (
      <section className="mt-16 border-t-2 border-oxblood pt-10">
        <button
          type="button"
          onClick={() => run(false)}
          className="bg-oxblood px-7 py-4 font-display text-base font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep"
        >
          Как это починить →
        </button>
        <p className="mt-2 font-sans text-sm text-ink-soft">покажу ваш первый экран переделанным</p>
        {state === "error" && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section className="mt-16 border-t-2 border-oxblood pt-10">
        <p className="font-display text-lg font-extrabold text-ink">Переделываю ваш первый экран…</p>
        <p className="mt-2 font-sans text-sm text-ink-soft">Думаю как дизайнер — обычно это занимает около 15 секунд.</p>
      </section>
    );
  }

  // Готово: превью + объяснения + CTA
  return (
    <section className="mt-16 border-t-2 border-oxblood pt-10">
      <h3 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Вот как мог бы выглядеть ваш первый экран</h3>

      <div className="mt-6 overflow-hidden border border-line shadow-[0_8px_30px_rgba(78,0,0,0.06)]">
        <div className="border-b border-line bg-paper-2 px-4 py-2 font-sans text-xs uppercase tracking-wide text-ink-soft">
          Переделанный первый экран
        </div>
        {/* sandbox без allow-scripts: чужой HTML ничего не выполнит, только разметка + стили */}
        <iframe
          sandbox=""
          srcDoc={html}
          title="Переделанный первый экран"
          loading="lazy"
          className="h-[600px] w-full border-0 bg-white"
        />
      </div>

      {changes.length > 0 && (
        <div className="mt-8">
          <h4 className="font-display text-lg font-extrabold text-ink">Что я поменяла и почему</h4>
          <ol className="mt-4 space-y-5">
            {changes.map((c, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-display text-xl font-black leading-none text-oxblood">{i + 1}</span>
                <div className="max-w-2xl font-sans text-[1.0625rem] leading-relaxed">
                  {c.почему && <p className="text-ink">{c.почему}</p>}
                  {(c.было || c.стало) && (
                    <p className="mt-1 text-sm text-ink-soft">
                      {c.было && <>Было: {c.было}. </>}
                      {c.стало && <>Стало: {c.стало}.</>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-10 bg-ink p-6 sm:p-8">
        <p className="max-w-xl font-sans text-lg text-paper">
          Это только первый экран. Так же можно пересобрать весь сайт, чтобы он приносил больше заявок.
        </p>
        <a
          href={OWNER}
          target="_blank"
          rel="noopener"
          className="mt-5 inline-block bg-paper px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-paper-2"
        >
          Обсудить редизайн →
        </a>
      </div>

      <button
        type="button"
        onClick={() => run(true)}
        className="mt-5 font-sans text-sm text-ink-soft underline-offset-2 transition hover:text-oxblood hover:underline"
      >
        переделать заново
      </button>
    </section>
  );
}
