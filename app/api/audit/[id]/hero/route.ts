import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateHeroRedesign } from "@/lib/hero-redesign";
import { config } from "@/lib/config";
import type { AuditResult } from "@/lib/audit-types";

export const runtime = "nodejs";

// POST /api/audit/:id/hero — демо-переделка первого экрана (HERO-REDESIGN.md).
// По клику, переиспользует готовый аудит, кэширует в events. ?force=1 — заново.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "1";
  const sb = getSupabase();

  // разбор должен быть готов
  const { data: audit } = await sb.from("audits").select("status, result, screenshots").eq("id", id).maybeSingle();
  if (!audit || audit.status !== "done" || !audit.result) {
    return NextResponse.json({ error: "Разбор не готов." }, { status: 404 });
  }
  // гейт: только разблокированный разбор (есть лид) — чтобы по прямому POST не жгли gpt-5.4
  const { data: lead } = await sb.from("leads").select("id").eq("audit_id", id).limit(1).maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "Доступно после открытия полного разбора." }, { status: 403 });
  }

  // кэш — отдаём сохранённое, пока не нажали «переделать заново»
  if (!force) {
    const { data: cached } = await sb
      .from("events")
      .select("meta")
      .eq("step", "hero_redesign")
      .eq("audit_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const m = cached?.meta as { html?: string; changes?: unknown } | null;
    if (m?.html) return NextResponse.json({ html: m.html, changes: m.changes ?? [] });
  }

  // потолок переделок на аудит (страховка от абьюза force)
  const { count } = await sb.from("events").select("id", { count: "exact", head: true }).eq("step", "hero_redesign").eq("audit_id", id);
  if ((count ?? 0) >= config.heroRedesignMaxPerAudit) {
    return NextResponse.json({ error: "Лимит переделок для этого разбора исчерпан." }, { status: 429 });
  }

  try {
    const result = audit.result as AuditResult;
    const shots = audit.screenshots as { fragments?: { base64: string }[]; desktop?: { base64: string } } | null;
    const shot = shots?.fragments?.[0]?.base64 ?? shots?.desktop?.base64 ?? null;

    const out = await generateHeroRedesign(result, shot);
    if (!out.html) return NextResponse.json({ error: "Не удалось переделать. Попробуйте ещё раз." }, { status: 502 });

    await sb.from("events").insert({
      step: "hero_redesign",
      audit_id: id,
      meta: { html: out.html, changes: out.changes, cost_cents: out.costCents, model: out.model },
    });
    return NextResponse.json({ html: out.html, changes: out.changes });
  } catch (e) {
    console.error("[hero] генерация не удалась:", e);
    return NextResponse.json({ error: "Не удалось переделать. Попробуйте ещё раз." }, { status: 500 });
  }
}
