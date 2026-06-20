import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { PERIODS, funnelStats, prevWindow, medianMinutesToLead, botStats } from "@/lib/admin-stats";
import Tag from "@/components/ui/Tag";
import StatusSelect from "@/components/admin/StatusSelect";
import SubmitButton from "@/components/admin/SubmitButton";
import AnalysisText from "@/components/admin/AnalysisText";
import RefreshBar from "@/components/admin/RefreshBar";
import NewSinceBadge from "@/components/admin/NewSinceBadge";
import FlashNumber from "@/components/admin/FlashNumber";
import { runMarketerAnalysis } from "./actions";
import { channelRu, siteTypeRu, statusRu, deliveryRu, sourceRu, relTime } from "./labels";

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

// Мелкая KPI-карточка (часть C). accent — оксблад-число для сигнальных метрик
// (горячее: непрочитанные новые, низкий средний балл = много кандидатов на редизайн).
function Delta({ n, unit }: { n: number | null; unit?: string }) {
  if (n === null || n === 0) return null;
  return (
    <span className={`font-sans text-xs font-semibold ${n > 0 ? "text-oxblood" : "text-espresso/40"}`}>
      {n > 0 ? "↑" : "↓"}
      {Math.abs(n)}
      {unit ?? ""}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  delta,
  deltaUnit,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  delta?: number | null;
  deltaUnit?: string;
}) {
  return (
    <div className="flex flex-col justify-between border border-espresso/15 p-3">
      <div className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-espresso/55">{label}</div>
      <div>
        <div
          className={`mt-2 flex items-baseline gap-1.5 font-display text-2xl font-extrabold leading-none tabular-nums ${
            accent ? "text-oxblood" : "text-espresso"
          }`}
        >
          <FlashNumber value={value} />
          <Delta n={delta ?? null} unit={deltaUnit} />
        </div>
        {hint ? <div className="mt-1 font-sans text-[0.7rem] leading-tight text-espresso/45">{hint}</div> : null}
      </div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; owner?: string; sort?: string }>;
}) {
  const sb = getSupabase();

  const sp = await searchParams;
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "7d";
  const periodLabel = (PERIODS.find((p) => p.key === period) ?? PERIODS[1]).label;

  // owner=1 → показать всё, включая мои тесты. По умолчанию — «без моих тестов» (A4).
  const ownerVisible = sp.owner === "1";
  const ownerCookie = (await cookies()).get("is_owner")?.value;
  const browserMarked = ownerCookie !== "off"; // помечен как мой (дефолт — да)
  const sort = sp.sort === "score" ? "score" : "date"; // сортировка лидов (часть D)

  // URL с текущими фильтрами + переопределениями (чтобы period/owner/sort не терялись).
  const url = (ov: { period?: string; owner?: boolean; sort?: string } = {}) => {
    const params = new URLSearchParams();
    params.set("period", ov.period ?? period);
    if (ov.owner ?? ownerVisible) params.set("owner", "1");
    const so = ov.sort ?? sort;
    if (so !== "date") params.set("sort", so);
    return `/admin?${params.toString()}`;
  };

  // Единый сбор статистики (хелпер — он же в AI-разборе и сравнении периодов).
  const stats = await funnelStats({ period, ownerVisible });
  const { funnel, maxDropIdx, maxDrop, auditMap, leadsNew, leadsEngaged, avgScore, convPct, instrStart, hidingPreInstr } = stats;
  const landedCount = stats.landed;
  const submittedCount = stats.submitted;

  // Динамика vs прошлый равный период (часть F). Для «всё время» сравнивать не с чем.
  const prevW = prevWindow(period);
  const prevStats = prevW ? await funnelStats({ period, ownerVisible, window: prevW }) : null;
  const leadsDelta = prevStats ? stats.leads.length - prevStats.leads.length : null;
  const engagedDelta = prevStats ? leadsEngaged - prevStats.leadsEngaged : null;
  const convDelta = prevStats && convPct !== null && prevStats.convPct !== null ? convPct - prevStats.convPct : null;

  // Реал-тайм (часть F): метка времени рендера + недавние заявки для бейджа «новых».
  const serverTime = new Date().toISOString();
  const { data: recentLeads } = await sb.from("leads").select("created_at").order("created_at", { ascending: false }).limit(50);
  const recentLeadTimes = (recentLeads ?? []).map((l) => l.created_at as string);

  // Источник трафика + темп (часть G).
  const bySource = new Map<string, number>();
  for (const l of stats.leads) {
    const s = l.source || "direct";
    bySource.set(s, (bySource.get(s) ?? 0) + 1);
  }
  const sources = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const medMins = await medianMinutesToLead({ period, ownerVisible });

  // Статистика бота (части H.3/H.4).
  const bot = await botStats({ period });

  // Сортировка лидов (часть D) — на уровне страницы (зависит от ?sort).
  let leads = stats.leads;
  if (sort === "score") {
    leads = [...leads].sort((a, b) => {
      const sa = a.audit_id ? auditMap.get(a.audit_id)?.score ?? null : null;
      const sbb = b.audit_id ? auditMap.get(b.audit_id)?.score ?? null : null;
      if (sa === null) return sbb === null ? 0 : 1;
      if (sbb === null) return -1;
      return sa - sbb;
    });
  }

  // Доставки лидам — для колонки «Отправлено».
  const sentMap = new Map<string, string[]>();
  const leadIds = leads.map((l) => l.id);
  if (leadIds.length) {
    const { data: logs } = await sb.from("emails_log").select("lead_id, channel, type, status").in("lead_id", leadIds);
    for (const log of logs ?? []) {
      const human = deliveryRu(log.channel, log.type, log.status);
      const arr = sentMap.get(log.lead_id) ?? [];
      arr.push(human);
      sentMap.set(log.lead_id, arr);
    }
  }

  // Последний AI-разбор статистики (кэш, часть E) — показываем, пока не нажали заново.
  const { data: lastAnalysis } = await sb
    .from("events")
    .select("meta, created_at")
    .eq("step", "admin_analysis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const analysis = (lastAnalysis?.meta ?? null) as
    | { text?: string; cost_cents?: number; model?: string; period_label?: string }
    | null;
  const analysisAt = lastAnalysis?.created_at ?? null;
  const dataThin = landedCount < config.marketerThinLanded; // мало данных → не гнать заново впустую

  // Форма запуска AI-разбора (server-action). subtle — приглушённый вариант при малых данных.
  const reanalyze = (label: string, subtle: boolean) => (
    <form action={runMarketerAnalysis} className={subtle ? "inline" : ""}>
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="owner" value={ownerVisible ? "1" : "0"} />
      <SubmitButton
        pendingText={subtle ? "разбираю…" : "Разбираю…"}
        className={
          subtle
            ? "font-sans text-espresso/45 underline underline-offset-2 hover:text-oxblood disabled:opacity-60"
            : "inline-block border border-oxblood bg-oxblood px-4 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-oxblood-deep disabled:opacity-60"
        }
      >
        {label}
      </SubmitButton>
    </form>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso/15 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-lg font-bold uppercase tracking-[0.35em] text-oxblood">RAZBOR</span>
          <NewSinceBadge timestamps={recentLeadTimes} />
          {bot.awaiting > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-oxblood bg-oxblood/10 px-3 py-1 font-sans text-xs font-medium text-oxblood">
              <span className="h-1.5 w-1.5 rounded-full bg-oxblood" />
              {bot.awaiting} {bot.awaiting === 1 ? "ждёт" : "ждут"} ответа в боте
            </span>
          )}
        </div>
        <RefreshBar serverTime={serverTime} />
      </header>

      <nav className="mt-5 flex flex-wrap items-center gap-1.5" aria-label="Период">
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <a
              key={p.key}
              href={url({ period: p.key })}
              className={`border px-3 py-1 font-sans text-sm transition-colors ${
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

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-sans text-sm">
        {/* Фильтр «без моих тестов» — ВКЛ по умолчанию (owner спрятан). */}
        <a href={url({ owner: !ownerVisible })} className="inline-flex items-center gap-2 text-espresso/80 hover:text-oxblood">
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
          <input type="hidden" name="back" value={url()} />
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

      <section className="mt-7">
        <Tag>Главное · {periodLabel.toLowerCase()}</Tag>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {/* Главная карточка — чуть крупнее остальных, оксблад-акцент (bento: 2×2). */}
          <div className="col-span-2 flex flex-col justify-between border border-oxblood/25 bg-oxblood/[0.04] p-4 sm:row-span-2">
            <div className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-espresso/55">Заявок за период</div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2.5 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-none tabular-nums text-oxblood">
                <FlashNumber value={leads.length} />
                <Delta n={leadsDelta} />
              </div>
              <div className="mt-1.5 font-sans text-xs text-espresso/55">
                {leadsNew} новых · {leadsEngaged} откликнулись
                {prevStats && <span className="text-espresso/40"> · vs прошлый</span>}
              </div>
            </div>
          </div>
          <Kpi
            label="Конверсия зашёл→заявка"
            value={convPct === null ? "—" : `${convPct}%`}
            hint={landedCount > 0 ? `${submittedCount} из ${landedCount}` : undefined}
            delta={convDelta}
            deltaUnit="пп"
          />
          <Kpi label="Откликнулись" value={leadsEngaged} accent={leadsEngaged > 0} delta={engagedDelta} />
          <Kpi label="Новых, не обработано" value={leadsNew} accent={leadsNew > 0} />
          <Kpi
            label="Средний балл сайтов"
            value={avgScore === null ? "—" : avgScore}
            hint={avgScore !== null && avgScore < 50 ? "низкий — много кандидатов на редизайн" : undefined}
            accent={avgScore !== null && avgScore < 50}
          />
        </div>
      </section>

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

      {/* AI-разбор — сразу под воронкой (ценный, держим высоко). */}
      <section className="mt-8">
        <Tag>AI-разбор статистики</Tag>
        {analysis?.text ? (
          <div className="mt-3">
            <div className="border border-espresso/15 bg-paper-2/40 p-4">
              <AnalysisText text={analysis.text} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-espresso/45">
              <span title={analysisAt ? new Date(analysisAt).toLocaleString("ru-RU") : ""}>
                сделано {analysisAt ? relTime(analysisAt) : "—"}
              </span>
              {analysis.period_label && <span>за «{analysis.period_label}»</span>}
              <span>стоил ≈{(analysis.cost_cents ?? 0).toFixed(2)}¢</span>
              {analysis.model && <span>{analysis.model}</span>}
            </div>
            {dataThin ? (
              <p className="mt-3 font-sans text-xs text-espresso/45">
                Данных пока мало — разбор не изменится, гонять заново смысла нет. {reanalyze("всё равно разобрать заново", true)}
              </p>
            ) : (
              <div className="mt-3">{reanalyze("Разобрать заново", false)}</div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-sans text-sm text-espresso/55">
              {dataThin
                ? "Данных мало — разбор будет короткий, но прогнать можно."
                : "AI-маркетолог разберёт воронку: где теряешь людей и что чинить."}
            </p>
            {reanalyze("Разобрать статистику", false)}
          </div>
        )}
      </section>

      {/* Вторичное — каналы, темп, бот — компактно в ряд (части G/H), не во всю ширину. */}
      <section className="mt-8">
        <Tag>Каналы и активность · {periodLabel.toLowerCase()}</Tag>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {/* Откуда заявки */}
          <div className="border border-espresso/15 p-3">
            <div className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-espresso/55">Откуда заявки</div>
            {sources.length ? (
              <div className="mt-2.5 space-y-1.5">
                {sources.map(([s, n]) => {
                  const pct = stats.leads.length ? Math.round((n / stats.leads.length) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-20 shrink-0 truncate font-sans text-xs text-espresso/80">{sourceRu(s)}</div>
                      <div className="relative h-3.5 flex-1 bg-espresso/8">
                        <div className="h-full bg-oxblood/70" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-5 shrink-0 text-right font-sans text-xs tabular-nums text-espresso">{n}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 font-sans text-xs text-espresso/45">Нет заявок за период.</p>
            )}
          </div>

          {/* Темп */}
          <div className="border border-espresso/15 p-3">
            <div className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-espresso/55">Темп до заявки</div>
            <div className="mt-2 font-display text-2xl font-extrabold tabular-nums text-espresso">
              {medMins === null ? "—" : medMins < 60 ? `~${medMins} мин` : `~${Math.round(medMins / 60)} ч`}
            </div>
            <div className="mt-1 font-sans text-[0.7rem] text-espresso/45">
              {medMins === null ? "данных мало" : "от захода до заявки"}
            </div>
          </div>

          {/* Бот */}
          <div className="border border-espresso/15 p-3">
            <div className="font-sans text-[0.7rem] uppercase tracking-[0.1em] text-espresso/55">Бот</div>
            <div className="mt-2.5 space-y-1.5 font-sans text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-espresso/70">Написали</span>
                <span className="font-display font-bold tabular-nums text-espresso">{bot.wrote}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-espresso/70">Сообщений</span>
                <span className="font-display font-bold tabular-nums text-espresso">{bot.messages}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={bot.awaiting > 0 ? "text-oxblood" : "text-espresso/70"}>Ждут ответа</span>
                <span className={`font-display font-bold tabular-nums ${bot.awaiting > 0 ? "text-oxblood" : "text-espresso"}`}>
                  {bot.awaiting}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 font-sans text-[0.7rem] text-espresso/40">
          «Ждут ответа» — лиды в статусе «Откликнулся»: написали в бота, но вы ещё не отметили их «Ответил».
        </p>
      </section>

      {/* Таблица лидов — детали внизу. */}
      <section className="mt-8">
        <Tag>Лиды · {periodLabel.toLowerCase()} ({leads.length})</Tag>
        {leads.length === 0 ? (
          <p className="mt-3 font-sans text-sm text-espresso/45">Лидов пока нет за этот период.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-espresso/20 text-left text-xs uppercase tracking-wide text-espresso/50">
                  <th className="py-2 pr-4">Контакт</th>
                  <th className="py-2 pr-4">Канал</th>
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2 pr-4">Тип</th>
                  <th className="py-2 pr-4">
                    <a href={url({ sort: "score" })} className={`hover:text-oxblood ${sort === "score" ? "text-oxblood" : ""}`}>
                      Балл{sort === "score" ? " ↑" : ""}
                    </a>
                  </th>
                  <th className="py-2 pr-4">Отправлено</th>
                  <th className="py-2 pr-4">
                    <a href={url({ sort: "date" })} className={`hover:text-oxblood ${sort === "date" ? "text-oxblood" : ""}`}>
                      Когда{sort === "date" ? " ↓" : ""}
                    </a>
                  </th>
                  <th className="py-2" aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const a = l.audit_id ? auditMap.get(l.audit_id) : undefined;
                  const contact = l.phone || (l.telegram ? `@${l.telegram}` : "") || l.email || "—";
                  const st = statusRu(l.status);
                  const sent = sentMap.get(l.id) ?? [];
                  const score = a?.score ?? null;
                  const hot = score !== null && score < 50;
                  return (
                    <tr key={l.id} className="group border-b border-espresso/8 transition-colors hover:bg-oxblood/[0.03]">
                      <td className="py-2 pr-4">
                        <Link href={`/admin/lead/${l.id}`} className="font-medium text-espresso hover:text-oxblood hover:underline">
                          {contact}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-espresso/70">{channelRu(l.channel)}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-espresso/70">{siteTypeRu(a?.site_type ?? null)}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {score === null ? (
                          <span className="text-espresso/40">—</span>
                        ) : hot ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-oxblood" title="Горячий: балл ниже 50">
                            <span className="h-1.5 w-1.5 rounded-full bg-oxblood" />
                            {score}
                          </span>
                        ) : (
                          <span className="text-espresso/70">{score}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-espresso/55">{sent.length ? sent.join(", ") : "—"}</td>
                      <td
                        className="whitespace-nowrap py-2 pr-4 text-espresso/50"
                        title={new Date(l.created_at).toLocaleString("ru-RU")}
                      >
                        {relTime(l.created_at)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <StatusSelect leadId={l.id} status={l.status} />
                          <Link
                            href={`/admin/lead/${l.id}`}
                            className="whitespace-nowrap font-sans text-xs text-oxblood hover:underline"
                          >
                            Открыть →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
