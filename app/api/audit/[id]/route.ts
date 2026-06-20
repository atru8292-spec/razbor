import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { toTeaser, type AuditResult } from "@/lib/audit-types";
import { telegramDeeplink } from "@/lib/delivery";

export const runtime = "nodejs";

// GET /api/audit/:id — поллинг статуса. Тизер отдаём всегда; полный разбор —
// только если по аудиту оставлен контакт (гейт, Flow B).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = getSupabase();

  const { data: audit, error } = await sb
    .from("audits")
    .select("id, url, status, progress, result, screenshots, pdf_url, error_message")
    .eq("id", id)
    .single();

  if (error || !audit) {
    return NextResponse.json({ error: "Проверка не найдена." }, { status: 404 });
  }

  const screenshots = (audit.screenshots ?? {}) as { preview?: string };

  const resp: Record<string, unknown> = {
    status: audit.status,
    progress: audit.progress ?? null,
    url: audit.url,
    error: audit.error_message ?? null,
  };

  // живое превью на экране ожидания (раздел 13.3)
  if ((audit.status === "running" || audit.status === "pending") && screenshots.preview) {
    resp.preview = screenshots.preview;
  }

  if (audit.status === "done" && audit.result) {
    const result = audit.result as AuditResult;
    resp.teaser = toTeaser(result);
    resp.pdfUrl = audit.pdf_url ?? null;

    const { data: leads } = await sb.from("leads").select("id").eq("audit_id", id).limit(1);
    const lead = leads?.[0];
    const unlocked = !!lead;
    resp.unlocked = unlocked;
    if (unlocked) {
      resp.full = result;
      resp.screenshots = audit.screenshots ?? null;
      // Подарок-чек-лист только в боте (GATE.md) — на сайт giftUrl не отдаём.
      resp.delivery = {
        telegramDeeplink: telegramDeeplink(lead.id),
      };
    }
  }

  return NextResponse.json(resp);
}
