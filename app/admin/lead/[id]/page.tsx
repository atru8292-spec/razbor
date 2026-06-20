import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { AuditResult } from "@/lib/audit-types";
import Tag from "@/components/ui/Tag";
import StatusSelect from "@/components/admin/StatusSelect";
import { channelRu, siteTypeRu, statusRu, relTime } from "../../labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRow {
  id: string;
  created_at: string;
  meta: { dir?: "in" | "out"; text?: string } | null;
}

function Score({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="border border-espresso/15 p-3">
      <div className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-espresso/55">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold tabular-nums text-espresso">{value ?? "—"}</div>
    </div>
  );
}

export default async function LeadCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getSupabase();

  const { data: lead } = await sb
    .from("leads")
    .select("id, audit_id, phone, telegram, email, channel, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: audit } = lead.audit_id
    ? await sb.from("audits").select("id, url, site_type, result").eq("id", lead.audit_id).maybeSingle()
    : { data: null };
  const result = (audit?.result ?? null) as AuditResult | null;
  const score = result?.overall_score ?? null;
  const hot = score !== null && score < 50;

  // Переписка с ботом (часть H): события bot_message по лиду. Наполняется логированием
  // в боте/воркере; у старых лидов пусто (раньше не сохранялось).
  const { data: chatRaw } = await sb
    .from("events")
    .select("id, created_at, meta")
    .eq("lead_id", id)
    .eq("step", "bot_message")
    .order("created_at", { ascending: true })
    .limit(500);
  const chat = (chatRaw ?? []) as ChatRow[];

  const contact = lead.phone || (lead.telegram ? `@${lead.telegram}` : "") || lead.email || "—";
  const st = statusRu(lead.status);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className="font-sans text-sm text-espresso/50 hover:text-oxblood">
        ← к воронке
      </Link>

      {/* Шапка лида */}
      <header className="mt-4 border-b border-espresso/15 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold text-espresso">{contact}</h1>
          <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-xs ${st.cls}`}>{st.label}</span>
          {hot && (
            <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-oxblood">
              <span className="h-1.5 w-1.5 rounded-full bg-oxblood" /> горячий
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm text-espresso/55">
          <span>{channelRu(lead.channel)}</span>
          <span title={new Date(lead.created_at).toLocaleString("ru-RU")}>пришёл {relTime(lead.created_at)}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="font-sans text-xs uppercase tracking-[0.1em] text-espresso/45">Статус:</span>
          <StatusSelect leadId={lead.id} status={lead.status} />
        </div>
      </header>

      {/* Что проверял + сводка аудита */}
      <section className="mt-8">
        <Tag>Что проверял</Tag>
        {audit && result ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <a
                href={audit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-display text-lg font-bold text-espresso hover:text-oxblood"
              >
                {audit.url}
              </a>
              <span className="font-sans text-sm text-espresso/55">{siteTypeRu(audit.site_type ?? null)}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Score label="Общий" value={result.overall_score} />
              <Score label="Конверсия" value={result.conversion_score} />
              <Score label="Удобство" value={result.usability_score} />
              <Score label="Нейропоиск" value={result.aeo_score} />
            </div>

            {result.verdict && (
              <p className="mt-4 font-sans text-[0.95rem] leading-relaxed text-espresso/85">
                <span className="font-semibold text-oxblood">Главная утечка. </span>
                {result.verdict}
              </p>
            )}

            {(result.top_priorities?.length ?? 0) > 0 && (
              <ol className="mt-4 space-y-1.5">
                {result.top_priorities.slice(0, 3).map((p, i) => (
                  <li key={i} className="flex gap-3 font-sans text-sm text-espresso/80">
                    <span className="font-display font-bold text-oxblood">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            )}

            <Link
              href={`/a/${audit.id}`}
              className="mt-5 inline-block border border-oxblood bg-oxblood px-4 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-oxblood-deep"
            >
              Открыть полный разбор →
            </Link>
          </div>
        ) : (
          <p className="mt-4 font-sans text-sm text-espresso/45">
            {lead.audit_id ? "Разбор ещё не готов или не сохранился." : "К лиду не привязан аудит."}
          </p>
        )}
      </section>

      {/* Переписка с ботом (часть H) */}
      <section className="mt-10">
        <Tag>Переписка с ботом</Tag>
        {chat.length > 0 ? (
          <div className="mt-4 space-y-2.5">
            {chat.map((m) => {
              const out = m.meta?.dir === "out"; // out = бот, in = человек
              return (
                <div key={m.id} className={`flex ${out ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap border px-3 py-2 font-sans text-sm ${
                      out ? "border-espresso/15 text-espresso/80" : "border-oxblood/30 bg-oxblood/[0.06] text-espresso"
                    }`}
                  >
                    <div className="mb-1 font-sans text-[0.7rem] uppercase tracking-[0.08em] text-espresso/40">
                      {out ? "бот" : contact} · <span title={new Date(m.created_at).toLocaleString("ru-RU")}>{relTime(m.created_at)}</span>
                    </div>
                    {m.meta?.text ?? ""}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 font-sans text-sm text-espresso/45">
            Переписки пока нет. Появится, когда человек напишет боту.
          </p>
        )}
      </section>
    </main>
  );
}
