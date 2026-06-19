import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { renderPdf } from "@/lib/scraper-client";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// GET /api/audit/:id/pdf — генерирует PDF печатью /print/:id и стримит (раздел 4.9).
// Гейт: только для разблокированного аудита (есть лид). По клику, без хранилища.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = getSupabase();

  const { data: audit } = await sb.from("audits").select("id, status").eq("id", id).single();
  if (!audit || audit.status !== "done") {
    return NextResponse.json({ error: "Отчёт ещё не готов." }, { status: 404 });
  }
  const { data: leads } = await sb.from("leads").select("id").eq("audit_id", id).limit(1);
  if (!leads?.length) {
    return NextResponse.json({ error: "Сначала откройте полный разбор." }, { status: 403 });
  }

  try {
    const pdf = await renderPdf(`${env.APP_BASE_URL}/print/${id}`);
    // отметим, что PDF доступен (для шеринга/кнопки)
    await sb.from("audits").update({ pdf_url: `${env.APP_BASE_URL}/api/audit/${id}/pdf` }).eq("id", id);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="razbor-${id.slice(0, 8)}.pdf"`,
        "cache-control": "private, max-age=600",
      },
    });
  } catch (e) {
    console.error("[api/pdf] ошибка:", e);
    return NextResponse.json({ error: "Не удалось собрать PDF. Попробуйте позже." }, { status: 502 });
  }
}
