// Клиентский хелпер отправки событий воронки. Best-effort, не блокирует UI.
"use client";

import type { EventStep } from "./events";

export function track(step: EventStep, opts: { auditId?: string; meta?: Record<string, unknown> } = {}): void {
  try {
    const payload = JSON.stringify({ step, auditId: opts.auditId, meta: opts.meta });
    // keepalive — чтобы событие ушло даже при уходе со страницы (contact_abandoned)
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // игнорируем
  }
}
