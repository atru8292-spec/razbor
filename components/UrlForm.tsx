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
    <form onSubmit={onSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          placeholder="example.ru"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
          className="flex-1 border-[1.5px] border-ink bg-transparent px-5 py-4 font-sans text-lg text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-oxblood"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-oxblood px-7 py-4 font-display text-base font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep disabled:opacity-50"
        >
          {busy ? "Запускаю…" : "Проверить сайт"}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={busy}
          className="border-[1.5px] border-line bg-transparent px-3 py-2 font-sans text-sm text-ink-soft outline-none focus:border-oxblood"
        >
          <option value="">Главная цель сайта (необязательно)</option>
          {GOAL_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <div className="origin-left scale-90">
          <Turnstile onToken={setToken} />
        </div>
      </div>

      {error && <p className="mt-3 font-sans text-sm text-oxblood">{error}</p>}
    </form>
  );
}
