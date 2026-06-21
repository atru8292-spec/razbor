"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/client-events";
import { Teaser, FullReport, type Screenshots } from "@/components/AuditView";
import ContactGate from "@/components/ContactGate";
import DeliveryBlock, { type Delivery } from "@/components/DeliveryBlock";
import WaitingScreen from "@/components/WaitingScreen";
import type { AuditResult, AuditTeaser } from "@/lib/audit-types";

interface AuditStatus {
  status: "pending" | "running" | "done" | "error";
  progress: string | null;
  url: string;
  error: string | null;
  preview?: string;
  teaser?: AuditTeaser;
  unlocked?: boolean;
  full?: AuditResult;
  screenshots?: Screenshots;
  delivery?: Delivery;
}

export default function AuditClient({ id }: { id: string }) {
  const [data, setData] = useState<AuditStatus | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const teaserTracked = useRef(false);
  const reportTracked = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setFetchError("Проверка не найдена.");
        return true;
      }
      const json: AuditStatus = await res.json();
      setData(json);
      return json.status === "done" || json.status === "error";
    } catch {
      return false;
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

  const waiting = !data || data.status === "pending" || data.status === "running";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="font-display text-sm font-bold uppercase tracking-[0.35em] text-oxblood">
        RAZBOR
      </Link>

      {fetchError && <p className="mt-10 font-sans text-espresso">{fetchError}</p>}

      {!fetchError && waiting && <WaitingScreen progress={data?.progress ?? null} url={data?.url} preview={data?.preview} />}

      {!fetchError && data?.status === "error" && (
        <div className="mt-20 border-l-2 border-oxblood pl-6">
          <h1 className="font-display text-2xl font-semibold text-espresso">Не удалось проверить сайт</h1>
          <p className="mt-2 font-sans text-espresso/70">{data.error || "Попробуйте другой адрес."}</p>
          <Link href="/" className="mt-5 inline-block font-sans text-sm text-oxblood underline">
            Проверить другой сайт
          </Link>
        </div>
      )}

      {!fetchError && data?.status === "done" && data.teaser && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
            <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Разбор сайта</h1>
            {data.url && <span className="font-sans text-sm text-ink-soft">{prettyUrl(data.url)}</span>}
          </div>

          <div className="mt-10">
            <Teaser teaser={data.teaser} />
          </div>

          {data.unlocked && data.full ? (
            <>
              {data.delivery && <DeliveryBlock delivery={data.delivery} pdfHref={`/api/audit/${id}/pdf`} />}
              <FullReport result={data.full} screenshots={data.screenshots ?? {}} auditId={id} />
            </>
          ) : (
            <div className="mt-12">
              <ContactGate auditId={id} onUnlocked={refresh} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function prettyUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
