import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import Tag from "@/components/ui/Tag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

// Кнопка-страховка (раздел A4): переключает метку владельца на ЭТОМ браузере.
// "1" = мой (исключаю из воронки), "off" = считать наравне со всеми. Middleware не
// перетирает "off", поэтому выбор держится. Авто-метка ставится при входе в /admin.
async function toggleOwner(formData: FormData): Promise<void> {
  "use server";
  const back = (formData.get("back") as string) || "/admin";
  const c = await cookies();
  const cur = c.get("is_owner")?.value;
  c.set("is_owner", cur === "1" ? "off" : "1", OWNER_COOKIE_OPTS);
  redirect(back);
}

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
  meta: { ip?: string; session_id?: string; is_owner?: boolean } | null;
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

// ── Человеческий язык (часть B). Наружу ни одного английского ключа. ──
const SITE_TYPE_RU: Record<string, string> = {
  ecommerce: "Интернет-магазин",
  leadgen: "Сбор заявок",
  saas: "Сервис/SaaS",
  info: "Инфопродукт",
  local: "Местный бизнес",
};
function siteTypeRu(t: string | null): string {
  return t ? SITE_TYPE_RU[t] ?? t : "—";
}

const CHANNEL_RU: Record<string, string> = {
  phone: "Телефон",
  telegram: "Telegram",
  email: "Почта",
  sms: "СМС",
};
function channelRu(c: string | null): string {
  return c ? CHANNEL_RU[c] ?? c : "—";
}

// Статус лида → подпись + класс бейджа-пилюли (откликнулся/клиент — оксблад-акцент).
const STATUS_RU: Record<string, { label: string; cls: string }> = {
  new: { label: "Новый", cls: "border-espresso/25 text-espresso/65" },
  engaged: { label: "Откликнулся", cls: "border-oxblood/40 bg-oxblood/10 text-oxblood" },
  replied: { label: "Ответил", cls: "border-oxblood/40 bg-oxblood/10 text-oxblood" },
  client: { label: "Клиент", cls: "border-oxblood bg-oxblood text-paper" },
};
function statusRu(s: string | null): { label: string; cls: string } {
  return STATUS_RU[s ?? "new"] ?? { label: s ?? "Новый", cls: "border-espresso/25 text-espresso/65" };
}

// Доставка подарка/писем — словами, что реально произошло (вместо telegram:gift и пр.).
const DELIVERY_TYPE_RU: Record<string, string> = { gift: "Подарок", report: "Отчёт", followup: "Письмо-догон" };
const DELIVERY_CHAN_RU: Record<string, string> = { telegram: "в Telegram", sms: "по СМС", email: "на почту" };
const DELIVERY_STATUS_RU: Record<string, string> = {
  sent: "отправлен",
  delivered: "доставлен",
  opened: "открыт",
  clicked: "перешёл по ссылке",
  bounced: "не дошёл",
  skipped: "не отправлен",
};
function deliveryRu(channel: string, type: string, status: string): string {
  const t = DELIVERY_TYPE_RU[type] ?? type;
  const c = DELIVERY_CHAN_RU[channel] ?? channel;
  const st = DELIVERY_STATUS_RU[status] ?? status;
  return `${t} ${c} (${st})`;
}

// Относительное время («2 часа назад», «вчера»); точная дата — в title по hover.
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
function relTime(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${plural(h, "час", "часа", "часов")} назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  if (d < 7) return `${d} ${plural(d, "день", "дня", "дней")} назад`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `${w} ${plural(w, "неделю", "недели", "недель")} назад`;
  }
  const mo = Math.floor(d / 30);
  return `${mo} ${plural(mo, "месяц", "месяца", "месяцев")} назад`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; owner?: string }>;
}) {
  const sb = getSupabase();

  const sp = await searchParams;
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "7d";
  const since = sinceIso(period);
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  // owner=1 → показать всё, включая мои тесты. По умолчанию (нет параметра) —
  // фильтр «без моих тестов» ВКЛ (раздел A4).
  const ownerVisible = sp.owner === "1";
  const ownerCookie = (await cookies()).get("is_owner")?.value;
  const browserMarked = ownerCookie !== "off"; // помечен как мой (дефолт — да)
  const qs = (p: string, owner: boolean) => `/admin?period=${p}${owner ? "&owner=1" : ""}`;

  // «Без моих тестов» прячет не только помеченные заходы, но и весь ДОТЕСТОВЫЙ шум —
  // всё, что раньше первого события с session_id. До запуска сквозной аналитики на
  // проде это была только хозяйка (cookie-метки тогда ещё не было). Так старые 39
  // заходов уходят при включённом фильтре (раздел B3 / фидбек с прода).
  let instrStart: string | null = null;
  if (!ownerVisible) {
    const { data: firstInstr } = await sb
      .from("events")
      .select("created_at")
      .not("meta->>session_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    instrStart = firstInstr?.created_at ?? null;
  }
  // нижняя граница выборки = позднейшая из (период, запуск аналитики)
  const effSince = instrStart && (!since || instrStart > since) ? instrStart : since;
  const hidingPreInstr = !ownerVisible && !!instrStart;

  // Тянем события воронки одним запросом и считаем УНИКАЛЬНЫЕ идентичности на шаг
  // (а не сырые события — иначе один человек, открывший разбор 5 раз, даёт 5).
  const funnelSteps = FUNNEL.map((f) => f.step);
  let evQuery = sb
    .from("events")
    .select("id, step, audit_id, meta")
    .in("step", funnelSteps)
    .limit(20000);
  if (effSince) evQuery = evQuery.gte("created_at", effSince);
  const { data: evRaw } = await evQuery;
  const events = (evRaw ?? []) as EventRow[];

  // Считаем уники на шаг. Заходы владельца (meta.is_owner) по умолчанию исключаем;
  // попутно собираем его audit_id — чтобы спрятать и его тестовые лиды.
  const stepSets = new Map<string, Set<string>>(funnelSteps.map((s) => [s, new Set<string>()]));
  const ownerAuditIds = new Set<string>();
  for (const e of events) {
    const owned = e.meta?.is_owner === true;
    if (owned && e.audit_id) ownerAuditIds.add(e.audit_id);
    if (owned && !ownerVisible) continue;
    stepSets.get(e.step)?.add(identity(e));
  }
  const funnel = FUNNEL.map((f) => ({ ...f, count: stepSets.get(f.step)?.size ?? 0 }));

  // Самый большой обрыв между шагами (по числу потерянных людей) — подсветим: дыра.
  let maxDropIdx = -1;
  let maxDrop = 0;
  for (let i = 1; i < funnel.length; i++) {
    const drop = funnel[i - 1].count - funnel[i].count;
    if (drop > maxDrop) {
      maxDrop = drop;
      maxDropIdx = i;
    }
  }

  let leadsQuery = sb
    .from("leads")
    .select("id, audit_id, phone, telegram, email, channel, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (effSince) leadsQuery = leadsQuery.gte("created_at", effSince);
  const { data: leadsRaw } = await leadsQuery;
  let leads = (leadsRaw ?? []) as LeadRow[];
  if (!ownerVisible) leads = leads.filter((l) => !(l.audit_id && ownerAuditIds.has(l.audit_id)));

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
      const human = deliveryRu(log.channel, log.type, log.status);
      const arr = sentMap.get(log.lead_id) ?? [];
      arr.push(human);
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
              href={qs(p.key, ownerVisible)}
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

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm">
        {/* Фильтр «без моих тестов» — ВКЛ по умолчанию (owner спрятан). */}
        <a href={qs(period, !ownerVisible)} className="inline-flex items-center gap-2 text-espresso/80 hover:text-oxblood">
          <span
            className={`inline-flex h-4 w-4 items-center justify-center border text-[10px] leading-none ${
              !ownerVisible ? "border-oxblood bg-oxblood text-paper" : "border-espresso/40 text-transparent"
            }`}
          >
            ✓
          </span>
          без моих тестов
        </a>
        {/* Кнопка-страховка: метка этого браузера. */}
        <form action={toggleOwner}>
          <input type="hidden" name="back" value={qs(period, ownerVisible)} />
          <button type="submit" className="text-espresso/50 underline-offset-2 hover:text-oxblood hover:underline">
            {browserMarked ? "этот браузер мой → считать наравне" : "этот браузер считается → пометить как мой"}
          </button>
        </form>
      </div>
      {hidingPreInstr ? (
        <p className="mt-1.5 font-sans text-xs text-espresso/45">
          Скрыты мои помеченные заходы и весь дотестовый шум — всё до запуска аналитики
          {instrStart ? ` (${new Date(instrStart).toLocaleDateString("ru-RU")})` : ""}. Старые заходы без метки тоже сюда не попадают.
        </p>
      ) : ownerVisible ? (
        <p className="mt-1.5 font-sans text-xs text-espresso/45">Показаны все заходы, включая мои тесты.</p>
      ) : (
        <p className="mt-1.5 font-sans text-xs text-espresso/45">Фильтр скрывает мои помеченные заходы (данных с меткой пока нет).</p>
      )}

      <section className="mt-8">
        <Tag>Воронка · уникальные посетители · {periodLabel.toLowerCase()}{ownerVisible ? " · с моими тестами" : ""}</Tag>
        <div className="mt-4 space-y-1.5">
          {funnel.map((f, i) => {
            const prev = i > 0 ? funnel[i - 1].count : f.count;
            const dropPct = i > 0 && prev > 0 ? Math.round((1 - f.count / prev) * 100) : 0;
            const widthPct = funnel[0].count > 0 ? Math.min(100, Math.round((f.count / funnel[0].count) * 100)) : 0;
            const isHole = i === maxDropIdx && maxDrop > 0;
            return (
              <div key={f.step} className="flex items-center gap-3">
                <div className={`w-44 shrink-0 font-sans text-sm ${isHole ? "font-bold text-oxblood" : "text-espresso/80"}`}>
                  {f.label}
                </div>
                <div className="relative h-7 flex-1 bg-espresso/8">
                  <div className={`h-full ${isHole ? "bg-oxblood" : "bg-oxblood/70"}`} style={{ width: `${widthPct}%` }} />
                </div>
                <div className="w-12 shrink-0 text-right font-display text-base font-bold tabular-nums text-espresso">
                  {f.count}
                </div>
                <div className="w-20 shrink-0 text-right font-sans text-xs tabular-nums">
                  {i === 0 ? (
                    <span className="text-espresso/35">старт</span>
                  ) : prev === 0 ? (
                    <span className="text-espresso/30">—</span>
                  ) : f.count > prev ? (
                    <span className="text-espresso/35">+{Math.round((f.count / prev - 1) * 100)}%</span>
                  ) : (
                    <span className={isHole ? "font-semibold text-oxblood" : "text-espresso/45"}>−{dropPct}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {maxDropIdx > 0 && maxDrop > 0 && (
          <p className="mt-3 font-sans text-sm text-espresso/70">
            Самый большой обрыв — на переходе к «{funnel[maxDropIdx].label.toLowerCase()}»:
            теряете <span className="font-semibold text-oxblood">{maxDrop}</span> из {funnel[maxDropIdx - 1].count}. С этого и начинать.
          </p>
        )}
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
                const st = statusRu(l.status);
                const sent = sentMap.get(l.id) ?? [];
                return (
                  <tr key={l.id} className="border-b border-espresso/8">
                    <td className="py-2.5 pr-4 text-espresso">{contact}</td>
                    <td className="py-2.5 pr-4 text-espresso/70">{channelRu(l.channel)}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-espresso/70">{siteTypeRu(a?.site_type ?? null)}</td>
                    <td className="py-2.5 pr-4 text-espresso/70 tabular-nums">{a?.score ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-espresso/55">{sent.length ? sent.join(", ") : "—"}</td>
                    <td
                      className="whitespace-nowrap py-2.5 pr-4 text-espresso/50"
                      title={new Date(l.created_at).toLocaleString("ru-RU")}
                    >
                      {relTime(l.created_at)}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-espresso/45">
                    Лидов пока нет за этот период
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
