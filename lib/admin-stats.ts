// Сбор данных воронки и KPI для /admin (части A–E). Единый источник чисел — чтобы
// страница, AI-разбор (E) и сравнение периодов (F) считали одинаково.
import { getSupabase } from "./supabase";

export const FUNNEL: { step: string; label: string }[] = [
  { step: "landed", label: "Зашли на лендинг" },
  { step: "url_entered", label: "Ввели URL" },
  { step: "audit_started", label: "Запустили аудит" },
  { step: "teaser_shown", label: "Увидели тизер" },
  { step: "contact_opened", label: "Открыли форму" },
  { step: "contact_submitted", label: "Оставили контакт" },
  { step: "report_viewed", label: "Открыли разбор" },
];

// Период фильтра. По умолчанию 7 дней — отрезает старый тестовый шум (раздел A2).
export const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "today", label: "Сегодня", days: 0 },
  { key: "7d", label: "7 дней", days: 7 },
  { key: "30d", label: "30 дней", days: 30 },
  { key: "all", label: "Всё время", days: null },
];

export function periodLabel(key: string): string {
  return (PERIODS.find((p) => p.key === key) ?? PERIODS[1]).label;
}

// ISO-граница периода: null = без ограничения (всё время).
export function sinceIso(periodKey: string): string | null {
  const p = PERIODS.find((x) => x.key === periodKey) ?? PERIODS[1]; // дефолт 7d
  if (p.days === null) return null;
  if (p.days === 0) {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // с начала сегодняшнего дня
    return d.toISOString();
  }
  return new Date(Date.now() - p.days * 86400000).toISOString();
}

interface EventRow {
  id: string;
  step: string;
  audit_id: string | null;
  meta: { ip?: string; session_id?: string; is_owner?: boolean } | null;
}

// Идентичность события: session_id (сквозной rid) → audit_id → IP → id (раздел A3).
function identity(e: EventRow): string {
  return e.meta?.session_id ?? e.audit_id ?? e.meta?.ip ?? e.id;
}

export interface LeadRow {
  id: string;
  audit_id: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  channel: string | null;
  status: string | null;
  created_at: string;
}

export interface FunnelStats {
  funnel: { step: string; label: string; count: number }[];
  maxDropIdx: number;
  maxDrop: number;
  landed: number;
  submitted: number;
  convPct: number | null;
  leads: LeadRow[]; // отфильтрованные (owner + дотестовый шум), date desc
  auditMap: Map<string, { site_type: string | null; score: number | null }>;
  leadsNew: number;
  leadsEngaged: number;
  avgScore: number | null;
  instrStart: string | null;
  hidingPreInstr: boolean;
  effSince: string | null;
}

// Главный сбор статистики за период. ownerVisible=false → прячем мои тесты и
// дотестовый шум (всё до первого события с session_id), раздел A4/B3.
export async function funnelStats(opts: { period: string; ownerVisible: boolean }): Promise<FunnelStats> {
  const sb = getSupabase();
  const since = sinceIso(opts.period);

  // Дотестовый шум — всё раньше первого события с session_id (раздел B3).
  let instrStart: string | null = null;
  if (!opts.ownerVisible) {
    const { data: firstInstr } = await sb
      .from("events")
      .select("created_at")
      .not("meta->>session_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    instrStart = firstInstr?.created_at ?? null;
  }
  const effSince = instrStart && (!since || instrStart > since) ? instrStart : since;
  const hidingPreInstr = !opts.ownerVisible && !!instrStart;

  // События воронки → уники на шаг (с исключением заходов владельца).
  const funnelSteps = FUNNEL.map((f) => f.step);
  let evQuery = sb.from("events").select("id, step, audit_id, meta").in("step", funnelSteps).limit(20000);
  if (effSince) evQuery = evQuery.gte("created_at", effSince);
  const { data: evRaw } = await evQuery;
  const events = (evRaw ?? []) as EventRow[];

  const stepSets = new Map<string, Set<string>>(funnelSteps.map((s) => [s, new Set<string>()]));
  const ownerAuditIds = new Set<string>();
  for (const e of events) {
    const owned = e.meta?.is_owner === true;
    if (owned && e.audit_id) ownerAuditIds.add(e.audit_id);
    if (owned && !opts.ownerVisible) continue;
    stepSets.get(e.step)?.add(identity(e));
  }
  const funnel = FUNNEL.map((f) => ({ ...f, count: stepSets.get(f.step)?.size ?? 0 }));

  let maxDropIdx = -1;
  let maxDrop = 0;
  for (let i = 1; i < funnel.length; i++) {
    const drop = funnel[i - 1].count - funnel[i].count;
    if (drop > maxDrop) {
      maxDrop = drop;
      maxDropIdx = i;
    }
  }

  // Лиды за период (+ owner-фильтр).
  let leadsQuery = sb
    .from("leads")
    .select("id, audit_id, phone, telegram, email, channel, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (effSince) leadsQuery = leadsQuery.gte("created_at", effSince);
  const { data: leadsRaw } = await leadsQuery;
  let leads = (leadsRaw ?? []) as LeadRow[];
  if (!opts.ownerVisible) leads = leads.filter((l) => !(l.audit_id && ownerAuditIds.has(l.audit_id)));

  // Баллы/тип аудитов лидов.
  const auditIds = leads.map((l) => l.audit_id).filter((x): x is string => !!x);
  const auditMap = new Map<string, { site_type: string | null; score: number | null }>();
  if (auditIds.length) {
    const { data: audits } = await sb.from("audits").select("id, site_type, result").in("id", auditIds);
    for (const a of audits ?? []) {
      const r = a.result as { overall_score?: number } | null;
      auditMap.set(a.id, { site_type: a.site_type ?? null, score: r?.overall_score ?? null });
    }
  }

  const leadsNew = leads.filter((l) => !l.status || l.status === "new").length;
  const leadsEngaged = leads.filter((l) => ["engaged", "replied", "client"].includes(l.status ?? "")).length;
  const landed = funnel[0].count;
  const submitted = funnel.find((f) => f.step === "contact_submitted")?.count ?? 0;
  const convPct = landed > 0 ? Math.round((submitted / landed) * 100) : null;
  const scores = leads
    .map((l) => (l.audit_id ? auditMap.get(l.audit_id)?.score : null))
    .filter((x): x is number => typeof x === "number");
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return {
    funnel,
    maxDropIdx,
    maxDrop,
    landed,
    submitted,
    convPct,
    leads,
    auditMap,
    leadsNew,
    leadsEngaged,
    avgScore,
    instrStart,
    hidingPreInstr,
    effSince,
  };
}
