"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { funnelStats, periodLabel } from "@/lib/admin-stats";
import { analyzeMarketing } from "@/lib/marketer";
import { STATUS_OPTIONS } from "./labels";

// Ручная смена статуса лида (часть D). Защищено тем же Basic-auth, что и страницы
// /admin (server-action POST-ит на роут /admin, middleware его покрывает).
// Авто-engaged по боту/вебхуку не ломаем — пишем в ту же колонку leads.status.
export async function setLeadStatus(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!leadId || !STATUS_OPTIONS.some((o) => o.value === status)) return;

  const { error } = await getSupabase().from("leads").update({ status }).eq("id", leadId);
  if (error) {
    console.error("[admin] не удалось сменить статус лида:", error);
    return;
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/lead/${leadId}`);
}

// AI-разбор статистики (часть E). По клику — тратит токены OpenAI, поэтому кэшируем
// результат в events(admin_analysis) и показываем последний, пока не нажали заново.
export async function runMarketerAnalysis(formData: FormData): Promise<void> {
  const period = String(formData.get("period") ?? "7d");
  const ownerVisible = formData.get("owner") === "1";

  try {
    const stats = await funnelStats({ period, ownerVisible });
    const lbl = periodLabel(period);
    const res = await analyzeMarketing(lbl, stats);
    await getSupabase()
      .from("events")
      .insert({
        step: "admin_analysis",
        meta: { period, period_label: lbl, text: res.text, cost_cents: res.costCents, model: res.model },
      });
  } catch (e) {
    console.error("[admin] AI-разбор не удался:", e);
  }
  revalidatePath("/admin");
}
