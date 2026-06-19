import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Вебхуки статусов Unisender Go → emails_log (раздел 12/14). clicked → лид engaged.
// Сопоставление по metadata.lead_id (кладём при отправке). Защита — общий секрет.
// Схема payload у Unisender Go может отличаться — парсим оборонительно.

const STATUS_MAP: Record<string, string> = {
  sent: "sent",
  delivered: "delivered",
  opened: "opened",
  open: "opened",
  clicked: "clicked",
  click: "clicked",
  soft_bounced: "bounced",
  hard_bounced: "bounced",
  bounced: "bounced",
  spam: "bounced",
};

interface ParsedEvent {
  event: string;
  leadId?: string;
}

function parseEvents(body: unknown): ParsedEvent[] {
  const out: ParsedEvent[] = [];
  const visit = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;
    const event = (o.event_name ?? o.event ?? o.status) as string | undefined;
    const data = (o.event_data ?? o) as Record<string, unknown>;
    const meta = (data.metadata ?? o.metadata) as Record<string, unknown> | undefined;
    const leadId = typeof meta?.lead_id === "string" ? meta.lead_id : undefined;
    if (event) out.push({ event: String(event).toLowerCase(), leadId });
    // рекурсивно по массивам/вложенным
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === "object") visit(v);
    }
  };
  if (Array.isArray(body)) body.forEach(visit);
  else visit(body);
  return out;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!env.UNISENDER_WEBHOOK_SECRET || secret !== env.UNISENDER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true }); // подтверждаем приём даже на пустой пинг
  }

  const sb = getSupabase();
  const events = parseEvents(body);
  for (const ev of events) {
    const status = STATUS_MAP[ev.event];
    if (!status || !ev.leadId) continue;
    const { data: rows } = await sb
      .from("emails_log")
      .select("id")
      .eq("lead_id", ev.leadId)
      .eq("channel", "email")
      .order("sent_at", { ascending: false })
      .limit(1);
    if (rows?.[0]) {
      await sb.from("emails_log").update({ status }).eq("id", rows[0].id);
    }
    if (status === "clicked") {
      await sb.from("leads").update({ status: "engaged" }).eq("id", ev.leadId);
    }
  }

  return NextResponse.json({ ok: true, processed: events.length });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// Unisender Go может проверять доступность URL — отвечаем 200.
export async function GET() {
  return NextResponse.json({ ok: true });
}
