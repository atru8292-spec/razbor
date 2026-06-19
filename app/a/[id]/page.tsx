"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/client-events";
import { Teaser, FullReport } from "@/components/AuditView";
import ContactGate from "@/components/ContactGate";
import type { AuditResult, AuditTeaser } from "@/lib/audit-types";

interface AuditStatus {
  status: "pending" | "running" | "done" | "error";
  progress: string | null;
  url: string;
  error: string | null;
  teaser?: AuditTeaser;
  unlocked?: boolean;
  full?: AuditResult;
}

const STAGE_HINT = "Снимаем сайт, считаем метрики и анализируем — обычно пара минут.";

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AuditStatus | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const teaserTracked = useRef(false);
  const reportTracked = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setFetchError("Проверка не найдена.");
        return true; // стоп
      }
      const json: AuditStatus = await res.json();
      setData(json);
      return json.status === "done" || json.status === "error";
    } catch {
      return false; // сеть моргнула — продолжаем поллинг
    }
  }, [id]);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const done = await poll();
      if (!done && !stop) timer = setTimeout(loop, 2500);
    };
    loop();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [poll]);

  // события воронки
  useEffect(() => {
    if (data?.teaser && !teaserTracked.current) {
      teaserTracked.current = true;
      track("teaser_shown", { auditId: id });
    }
    if (data?.full && !reportTracked.current) {
      reportTracked.current = true;
      track("report_viewed", { auditId: id });
    }
  }, [data, id]);

  const refresh = useCallback(() => {
    poll();
  }, [poll]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="font-display text-sm uppercase tracking-[0.3em] text-oxblood">
        Razbor
      </Link>

      {fetchError && <p className="mt-10 font-sans text-espresso">{fetchError}</p>}

      {!fetchError && (!data || data.status === "pending" || data.status === "running") && (
        <div className="mt-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-espresso/20 border-t-oxblood" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-espresso">Проверяем сайт…</h1>
          <p className="mt-2 font-sans text-espresso/70">{data?.progress || STAGE_HINT}</p>
          {data?.url && <p className="mt-1 font-sans text-sm text-espresso/50">{data.url}</p>}
        </div>
      )}

      {!fetchError && data?.status === "error" && (
        <div className="mt-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-espresso">Не удалось проверить сайт</h1>
          <p className="mt-2 font-sans text-espresso/70">{data.error || "Попробуйте другой адрес."}</p>
        </div>
      )}

      {!fetchError && data?.status === "done" && data.teaser && (
        <div className="mt-10">
          <h1 className="font-display text-2xl font-semibold text-espresso">Разбор сайта</h1>
          {data.url && <p className="mt-1 font-sans text-sm text-espresso/50">{data.url}</p>}

          <div className="mt-6">
            <Teaser teaser={data.teaser} />
          </div>

          {data.unlocked && data.full ? (
            <FullReport result={data.full} />
          ) : (
            <div className="mt-10">
              <ContactGate auditId={id} onUnlocked={refresh} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
