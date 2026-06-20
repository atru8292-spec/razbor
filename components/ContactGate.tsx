"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/client-events";

// Гейт-форма (Flow B): контакт открывает полный разбор + PDF + подарок.
// Turnstile здесь не нужен — бот-защита уже была на старте аудита.
export default function ContactGate({ auditId, onUnlocked }: { auditId: string; onUnlocked: () => void }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("contact_opened", { auditId });
    // contact_abandoned, если ушёл не отправив
    const onHide = () => {
      if (!submitted && document.visibilityState === "hidden") {
        track("contact_abandoned", { auditId });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [auditId, submitted]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Укажите корректную почту.");
      return;
    }
    if (!consent) {
      setError("Нужно согласие на обработку данных.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ auditId, email: email.trim(), consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить контакт.");
        setBusy(false);
        return;
      }
      setSubmitted(true);
      onUnlocked();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-t-2 border-oxblood pt-8">
      <h3 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Открыть полный разбор</h3>
      <p className="mt-3 max-w-lg font-sans text-ink-soft">
        Оставьте почту — откроем разбор по всем направлениям и пришлём его на почту. А чек-лист
        «Где сайт теряет заявки» заберёте в Telegram.
      </p>

      <div className="mt-6 max-w-lg">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Ваш e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          className="w-full border-[1.5px] border-ink bg-transparent px-4 py-3 font-sans text-ink outline-none transition focus:border-oxblood"
        />
      </div>

      <label className="mt-4 flex max-w-lg items-start gap-2 font-sans text-xs text-ink-soft">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} className="mt-0.5" />
        <span>
          Согласен на обработку персональных данных согласно{" "}
          <Link href="/policy" target="_blank" className="underline">
            политике
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full max-w-lg bg-oxblood px-6 py-4 font-display font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep disabled:opacity-50"
      >
        {busy ? "Открываю…" : "Открыть полный разбор"}
      </button>

      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
    </form>
  );
}
