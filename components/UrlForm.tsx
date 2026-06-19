"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/client-events";
import { GOAL_OPTIONS } from "@/lib/validation";
import Turnstile from "./Turnstile";

export default function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("landed");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Вставьте ссылку на сайт.");
      return;
    }
    if (!token) {
      setError("Подождите секунду — идёт проверка, что вы не робот.");
      return;
    }
    setBusy(true);
    track("url_entered", { meta: { url } });
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, goal: goal || null, turnstileToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так. Попробуйте ещё раз.");
        setBusy(false);
        return;
      }
      router.push(`/a/${data.auditId}`);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          placeholder="example.ru"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
          className="flex-1 rounded-md border border-espresso/20 bg-white px-4 py-3 font-sans text-espresso outline-none focus:border-oxblood"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-oxblood px-6 py-3 font-display font-semibold uppercase tracking-wide text-paper transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Запускаю…" : "Проверить сайт"}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={busy}
          className="rounded-md border border-espresso/20 bg-white px-3 py-2 font-sans text-sm text-espresso/80 outline-none focus:border-oxblood"
        >
          <option value="">Главная цель сайта (необязательно)</option>
          {GOAL_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <div className="scale-90 origin-left">
          <Turnstile onToken={setToken} />
        </div>
      </div>

      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
    </form>
  );
}
