// Follow-up цепочка по почте (раздел 12). Крон в воркере раз в час.
// followup_stage: 0 — отправлен только подарок; 1 — касание 1; 2 — касание 2 (финал).
import { getSupabase } from "./supabase";
import { env } from "./env";
import { config } from "./config";
import { sendEmail } from "./unisender";
import { followupEmail } from "./email-templates";
import { reportUrl } from "./delivery";

const OWNER_CONTACT = env.NEXT_PUBLIC_OWNER_CONTACT;
const BATCH = 50;

interface DueLead {
  id: string;
  audit_id: string | null;
  email: string | null;
  followup_stage: number;
}

/** Один проход цепочки. Безопасно дёргать раз в час. */
export async function followupTick(): Promise<void> {
  for (const touch of [1, 2] as const) {
    const fromStage = touch - 1; // касание touch отправляем лидам на стадии touch-1
    const minAgeDays = config.followupDays[touch]; // [0,2,6] → день 2 и день 6
    const cutoff = new Date(Date.now() - minAgeDays * 86_400_000).toISOString();

    const { data, error } = await getSupabase()
      .from("leads")
      .select("id, audit_id, email, followup_stage")
      .eq("followup_stage", fromStage)
      .not("email", "is", null)
      .eq("consent", true)
      .lte("created_at", cutoff)
      .limit(BATCH);

    if (error) {
      console.error("[followup] выборка не удалась:", error);
      continue;
    }

    for (const lead of (data ?? []) as DueLead[]) {
      if (!lead.email || !lead.audit_id) continue;
      const { subject, html } = followupEmail(touch, {
        reportUrl: reportUrl(lead.audit_id),
        ownerContact: OWNER_CONTACT,
      });
      const res = await sendEmail({ to: lead.email, subject, html, metadata: { lead_id: lead.id } });

      // нет транспорта → не двигаем стадию (отправим, когда настроят Unisender)
      if (res.skipped) {
        await logFollowup(lead.id, "skipped");
        continue;
      }
      await getSupabase().from("leads").update({ followup_stage: touch }).eq("id", lead.id);
      await logFollowup(lead.id, res.ok ? "sent" : "failed");
      if (!res.ok) console.error(`[followup] касание ${touch} лиду ${lead.id}:`, res.error);
    }
  }
}

async function logFollowup(leadId: string, status: string): Promise<void> {
  try {
    await getSupabase().from("emails_log").insert({ lead_id: leadId, channel: "email", type: "followup", status });
  } catch (e) {
    console.error("[followup] лог не записан:", e);
  }
}
