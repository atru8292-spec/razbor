"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
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
