import { getSupabase } from "@/lib/supabase";
import Tag from "@/components/ui/Tag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Закрытая воронка/аналитика (раздел 14). Доступ — Basic-auth в middleware.
const FUNNEL: { step: string; label: string }[] = [
  { step: "landed", label: "Зашли на лендинг" },
  { step: "url_entered", label: "Ввели URL" },
  { step: "audit_started", label: "Запустили аудит" },
  { step: "teaser_shown", label: "Увидели тизер" },
  { step: "contact_opened", label: "Открыли форму" },
  { step: "contact_submitted", label: "Оставили контакт" },
  { step: "report_viewed", label: "Открыли разбор" },
];

// Период фильтра. По умолчанию 7 дней — отрезает старый тестовый шум (раздел A2).
const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "today", label: "Сегодня", days: 0 },
  { key: "7d", label: "7 дней", days: 7 },
  { key: "30d", label: "30 дней", days: 30 },
  { key: "all", label: "Всё время", days: null },
];

// ISO-граница периода: null = без ограничения (всё время).
function sinceIso(periodKey: string): string | null {
  const p = PERIODS.find((x) => x.key === periodKey) ?? PERIODS[1]; // дефолт 7d
  if (p.days === null) return null;
  if (p.days === 0) {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // с начала сегодняшнего дня
    return d.toISOString();
  }
  return new Date(Date.now() - p.days * 86400000).toISOString();
}

// Сырая строка события для подсчёта уников.
interface EventRow {
  id: string;
  step: string;
  audit_id: string | null;
  meta: { ip?: string; session_id?: string } | null;
}

// Уникальная идентичность события. session_id (сквозной rid-cookie, раздел A3) —
// единый ключ через ВСЕ шаги воронки: один посетитель считается один раз от входа
// до разбора, базисы сходятся, воронка монотонна. Fallback для старых событий без
// session_id: audit_id → IP → id (приблизительно, уходит из окна за счёт фильтра дат).
function identity(e: EventRow): string {
  return e.meta?.session_id ?? e.audit_id ?? e.meta?.ip ?? e.id;
}

interface LeadRow {
  id: string;
  audit_id: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  channel: string | null;
  status: string | null;
  created_at: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sb = getSupabase();

  const sp = await searchParams;
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "7d";
  const since = sinceIso(period);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  // Тянем события воронки одним запросом и считаем УНИКАЛЬНЫЕ идентичности на шаг
  // (а не сырые события — иначе один человек, открывший разбор 5 раз, даёт 5).
  const funnelSteps = FUNNEL.map((f) => f.step);
  let evQuery = sb
    .from("events")
    .select("id, step, audit_id, meta")
    .in("step", funnelSteps)
    .limit(20000);
  if (since) evQuery = evQuery.gte("created_at", since);
  const { data: evRaw } = await evQuery;
  const events = (evRaw ?? []) as EventRow[];

  const stepSets = new Map<string, Set<string>>(funnelSteps.map((s) => [s, new Set<string>()]));
  for (const e of events) stepSets.get(e.step)?.add(identity(e));
  const funnel = FUNNEL.map((f) => ({ ...f, count: stepSets.get(f.step)?.size ?? 0 }));

  let leadsQuery = sb
    .from("leads")
    .select("id, audit_id, phone, telegram, email, channel, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (since) leadsQuery = leadsQuery.gte("created_at", since);
  const { data: leadsRaw } = await leadsQuery;
  const leads = (leadsRaw ?? []) as LeadRow[];

  const auditIds = leads.map((l) => l.audit_id).filter((x): x is string => !!x);
  const leadIds = leads.map((l) => l.id);

  const auditMap = new Map<string, { site_type: string | null; score: number | null }>();
  if (auditIds.length) {
    const { data: audits } = await sb.from("audits").select("id, site_type, result").in("id", auditIds);
    for (const a of audits ?? []) {
      const r = a.result as { overall_score?: number } | null;
      auditMap.set(a.id, { site_type: a.site_type ?? null, score: r?.overall_score ?? null });
    }
  }

  const sentMap = new Map<string, string[]>();
  if (leadIds.length) {
    const { data: logs } = await sb.from("emails_log").select("lead_id, channel, type, status").in("lead_id", leadIds);
    for (const log of logs ?? []) {
      const key = `${log.channel}:${log.type}${log.status === "sent" ? "" : `(${log.status})`}`;
      const arr = sentMap.get(log.lead_id) ?? [];
      arr.push(key);
      sentMap.set(log.lead_id, arr);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-espresso/15 pb-4">
        <span className="font-display text-lg font-bold uppercase tracking-[0.35em] text-oxblood">RAZBOR</span>
        <span className="font-sans text-sm text-espresso/50">admin · воронка</span>
      </header>

      <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Период">
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <a
              key={p.key}
              href={`/admin?period=${p.key}`}
              className={`border px-3 py-1.5 font-sans text-sm transition-colors ${
                active
                  ? "border-oxblood bg-oxblood text-paper"
                  : "border-espresso/20 text-espresso/70 hover:border-oxblood/50 hover:text-oxblood"
              }`}
            >
              {p.label}
            </a>
          );
        })}
      </nav>

      <section className="mt-8">
        <Tag>Воронка · уникальные посетители · {periodLabel.toLowerCase()}</Tag>
        <div className="mt-4 space-y-1">
          {funnel.map((f, i) => {
            const prev = i > 0 ? funnel[i - 1].count : f.count;
            const conv = prev > 0 ? Math.min(100, Math.round((f.count / prev) * 100)) : 100;
            const widthPct = funnel[0].count > 0 ? Math.min(100, Math.round((f.count / funnel[0].count) * 100)) : 0;
            return (
              <div key={f.step} className="flex items-center gap-3">
                <div className="w-44 shrink-0 font-sans text-sm text-espresso/80">{f.label}</div>
                <div className="relative h-7 flex-1 bg-espresso/8">
                  <div className="h-full bg-oxblood/80" style={{ width: `${widthPct}%` }} />
                </div>
                <div className="w-28 shrink-0 text-right font-sans text-sm text-espresso">
                  {f.count}
                  {i > 0 && <span className="ml-2 text-xs text-espresso/45">{conv}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <Tag>Лиды · {periodLabel.toLowerCase()} ({leads.length})</Tag>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-espresso/20 text-left text-xs uppercase tracking-wide text-espresso/50">
                <th className="py-2 pr-4">Контакт</th>
                <th className="py-2 pr-4">Канал</th>
                <th className="py-2 pr-4">Статус</th>
                <th className="py-2 pr-4">Тип</th>
                <th className="py-2 pr-4">Балл</th>
                <th className="py-2 pr-4">Отправлено</th>
                <th className="py-2 pr-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const a = l.audit_id ? auditMap.get(l.audit_id) : undefined;
                const contact = l.phone || (l.telegram ? `@${l.telegram}` : "") || l.email || "—";
                return (
                  <tr key={l.id} className="border-b border-espresso/8">
                    <td className="py-2 pr-4 text-espresso">{contact}</td>
                    <td className="py-2 pr-4 text-espresso/70">{l.channel ?? "—"}</td>
                    <td className="py-2 pr-4 text-espresso/70">{l.status ?? "new"}</td>
                    <td className="py-2 pr-4 text-espresso/70">{a?.site_type ?? "—"}</td>
                    <td className="py-2 pr-4 text-espresso/70">{a?.score ?? "—"}</td>
                    <td className="py-2 pr-4 text-espresso/55">{(sentMap.get(l.id) ?? []).join(", ") || "—"}</td>
                    <td className="py-2 pr-4 text-espresso/50">{new Date(l.created_at).toLocaleDateString("ru-RU")}</td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-espresso/40">Лидов пока нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
