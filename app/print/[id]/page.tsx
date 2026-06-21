import { getSupabase } from "@/lib/supabase";
import { toTeaser, type AuditResult } from "@/lib/audit-types";
import { Teaser, FullReport, type Screenshots } from "@/components/AuditView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Печатная версия отчёта для PDF (раздел 4.9). Скрапер печатает эту страницу.
// Гейт: рендерим полный отчёт только для разблокированного аудита (есть лид).
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getSupabase();

  const { data: audit } = await sb
    .from("audits")
    .select("url, status, result, screenshots")
    .eq("id", id)
    .single();

  if (!audit || audit.status !== "done" || !audit.result) {
    return <main className="p-10 font-sans text-espresso">Отчёт ещё не готов.</main>;
  }

  const { data: leads } = await sb.from("leads").select("id").eq("audit_id", id).limit(1);
  if (!leads?.length) {
    return <main className="p-10 font-sans text-espresso">Отчёт недоступен.</main>;
  }

  const result = audit.result as AuditResult;
  const screenshots = (audit.screenshots ?? {}) as Screenshots;
  const host = hostOf(audit.url);

  return (
    <main className="mx-auto max-w-4xl px-8 py-8">
      <header className="flex items-baseline justify-between border-b border-espresso/15 pb-4">
        <span className="font-display text-lg font-bold uppercase tracking-[0.35em] text-oxblood">RAZBOR</span>
        <span className="font-sans text-sm text-espresso/60">{host}</span>
      </header>
      <div className="mt-8">
        <Teaser teaser={toTeaser(result)} />
      </div>
      <FullReport result={result} screenshots={screenshots} auditId={id} print />
      <footer className="mt-12 border-t border-espresso/15 pt-4 font-sans text-xs text-espresso/45">
        RAZBOR — аудит сайтов · getrazbor.ru
      </footer>
    </main>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
