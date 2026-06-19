"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/client-events";

// Гейт-форма (Flow B): контакт открывает полный разбор + PDF + подарок.
// Turnstile здесь не нужен — бот-защита уже была на старте аудита.
export default function ContactGate({ auditId, onUnlocked }: { auditId: string; onUnlocked: () => void }) {
  const [contact, setContact] = useState("");
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
    if (!contact.trim()) {
      setError("Укажите телефон или телеграм.");
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
        body: JSON.stringify({ auditId, contact, email: email || null, consent }),
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
    <form onSubmit={onSubmit} className="rounded-lg border border-espresso/15 bg-white p-6">
      <h3 className="font-display text-xl font-semibold text-espresso">Открыть полный разбор</h3>
      <p className="mt-2 font-sans text-sm text-espresso/70">
        Оставьте контакт — откроем разбор по всем направлениям, отдадим PDF и подарок «Где сайт
        теряет заявки».
      </p>

      <input
        type="text"
        placeholder="Телефон или @телеграм"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        disabled={busy}
        className="mt-4 w-full rounded-md border border-espresso/20 px-4 py-3 font-sans text-espresso outline-none focus:border-oxblood"
      />
      <input
        type="email"
        placeholder="E-mail (по желанию)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        className="mt-3 w-full rounded-md border border-espresso/20 px-4 py-3 font-sans text-espresso outline-none focus:border-oxblood"
      />

      <label className="mt-4 flex items-start gap-2 font-sans text-xs text-espresso/70">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy}
          className="mt-0.5"
        />
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
        className="mt-5 w-full rounded-md bg-oxblood px-6 py-3 font-display font-semibold uppercase tracking-wide text-paper transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Открываю…" : "Получить разбор и подарок"}
      </button>

      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
    </form>
  );
}
