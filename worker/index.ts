// Фоновый воркер аудитов (отдельный pm2-процесс, разделы 4/5 ТЗ).
// Берёт pending-задачи ПО ОДНОЙ за раз (память под Chromium), гоняет пайплайн,
// пишет прогресс, ставит done/error. Мягкие ошибки: не падать молча.
import "dotenv/config";
import { getSupabase } from "../lib/supabase";
import { config } from "../lib/config";
import { runPipeline } from "./pipeline";
import { followupTick } from "../lib/followup";

let running = true;

async function setProgress(id: string, progress: string): Promise<void> {
  await getSupabase().from("audits").update({ progress }).eq("id", id);
}

// Превью для экрана ожидания пишем в screenshots.preview (перезапишется финальными при done).
async function savePreview(id: string, base64: string): Promise<void> {
  await getSupabase().from("audits").update({ screenshots: { preview: base64 } }).eq("id", id);
}

/** Атомарно застолбить самый старый pending. Возвращает задачу или null. */
async function claimNext(): Promise<{ id: string; url: string; goal: string | null } | null> {
  const sb = getSupabase();
  const { data: pending } = await sb
    .from("audits")
    .select("id, url, goal")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  const task = pending?.[0];
  if (!task) return null;

  // claim: переводим в running только если всё ещё pending (защита от гонки)
  const { data: claimed } = await sb
    .from("audits")
    .update({ status: "running", progress: "В очереди…" })
    .eq("id", task.id)
    .eq("status", "pending")
    .select("id, url, goal")
    .single();

  return claimed ?? null;
}

async function processOne(task: { id: string; url: string; goal: string | null }): Promise<void> {
  console.log(`[worker] аудит ${task.id} — ${task.url}`);
  try {
    const out = await runPipeline(
      task,
      (p) => setProgress(task.id, p),
      (b64) => savePreview(task.id, b64),
    );
    await getSupabase()
      .from("audits")
      .update({
        status: "done",
        progress: null,
        result: out.result,
        screenshots: out.screenshots,
        site_type: out.siteType,
        error_message: null,
      })
      .eq("id", task.id);
    // usage пишем в лог; продуктовая аналитика стоимости — в /admin (Шаг 9)
    console.log(`[worker] аудит ${task.id} готов. usage:`, out.usage, "site_type:", out.siteType);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось завершить аудит.";
    console.error(`[worker] аудит ${task.id} ошибка:`, message);
    await getSupabase()
      .from("audits")
      .update({ status: "error", progress: null, error_message: message })
      .eq("id", task.id);
  }
}

// Follow-up цепочка (раздел 12): отдельный крон раз в час, без наложений.
let followupBusy = false;
async function followupCron(): Promise<void> {
  if (followupBusy) return;
  followupBusy = true;
  try {
    await followupTick();
  } catch (e) {
    console.error("[worker] followup ошибка:", e);
  } finally {
    followupBusy = false;
  }
}

async function loop(): Promise<void> {
  console.log("[worker] up, опрашиваю pending-задачи");
  setInterval(followupCron, 60 * 60 * 1000);
  while (running) {
    try {
      const task = await claimNext();
      if (task) {
        await processOne(task);
        continue; // сразу берём следующую, без паузы
      }
    } catch (e) {
      console.error("[worker] ошибка цикла:", e);
    }
    await new Promise((r) => setTimeout(r, config.worker.pollIntervalMs));
  }
}

process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM, останавливаюсь");
  running = false;
  setTimeout(() => process.exit(0), 500);
});

loop().catch((e) => {
  console.error("[worker] фатально:", e);
  process.exit(1);
});
