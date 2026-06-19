// Telegram-бот выдачи подарка (отдельный pm2-процесс, разделы 11–12 ТЗ).
// Бот НЕ может писать первым — пользователь приходит по диплинку t.me/BOT?start=<lead.id>.
// По токену находим лид и отдаём подарок + ссылку на отчёт. Follow-up сообщения — Шаг 8.
import "dotenv/config";
import { Telegraf } from "telegraf";
import { env } from "../lib/env";
import { getSupabase } from "../lib/supabase";
import { giftUrl, reportUrl, logDelivery } from "../lib/delivery";
import { logEvent } from "../lib/events";

// Касание 0 в боте (REDESIGN §9): живо, с тизером следующего касания.
// token = lead.id; chatId сохраняем в events(tg_started) для telegram-догонов.
export async function handleStart(token: string | undefined, chatId?: number): Promise<string> {
  if (!token) {
    return "Это бот сервиса RAZBOR. Чтобы забрать разбор и подарок — перейдите по ссылке со страницы результата.";
  }
  const { data: lead } = await getSupabase().from("leads").select("id, audit_id").eq("id", token).single();
  if (!lead || !lead.audit_id) {
    return "Не нашли ваш разбор по ссылке. Откройте результат на сайте и нажмите «Забрать в Telegram» ещё раз.";
  }

  // сохраняем chat_id для будущих касаний + лог выдачи (без дублей)
  if (chatId != null) {
    await logEvent("tg_started", { auditId: lead.audit_id, leadId: lead.id, meta: { chat_id: chatId } });
  }
  const { data: already } = await getSupabase()
    .from("emails_log")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("channel", "telegram")
    .eq("type", "gift")
    .limit(1);
  if ((already?.length ?? 0) === 0) {
    await logDelivery(lead.id, "telegram", "gift", "sent");
  }

  return [
    "Рада помочь! Держите ваш разбор и подарок 🎁",
    "",
    `📊 Полный разбор: ${reportUrl(lead.audit_id)}`,
    `📄 Чек-лист «Где сайт теряет заявки»: ${giftUrl()}`,
    "",
    "Загляните в разбор — там сразу видно главную утечку.",
    "Через пару дней напишу, с чего бы я начала чинить ваш сайт.",
  ].join("\n");
}

/** Лид написал боту → останавливаем цепочку (engaged, §9). Возвращает true, если нашли лид. */
async function markEngagedByChat(chatId: number): Promise<boolean> {
  const { data } = await getSupabase()
    .from("events")
    .select("lead_id")
    .eq("step", "tg_started")
    .filter("meta->>chat_id", "eq", String(chatId))
    .order("created_at", { ascending: false })
    .limit(1);
  const leadId = data?.[0]?.lead_id;
  if (!leadId) return false;
  await getSupabase().from("leads").update({ status: "engaged" }).eq("id", leadId);
  return true;
}

async function main() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log("[bot] TELEGRAM_BOT_TOKEN не задан — каркас работает вхолостую");
    setInterval(() => {}, 60_000);
    return;
  }

  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  bot.start(async (ctx) => {
    try {
      const token = ctx.startPayload?.trim() || undefined;
      const reply = await handleStart(token, ctx.chat?.id);
      await ctx.reply(reply, { link_preview_options: { is_disabled: true } });
    } catch (e) {
      console.error("[bot] ошибка /start:", e);
      await ctx.reply("Что-то пошло не так. Попробуйте ещё раз чуть позже.");
    }
  });

  // Любое сообщение (не /start) = человек ответил → стоп цепочки + передаём Арине.
  bot.on("message", async (ctx) => {
    try {
      const found = await markEngagedByChat(ctx.chat.id);
      await ctx.reply(
        found
          ? "Спасибо, что написали! Передаю Арине — она ответит и подскажет по вашему сайту."
          : "Чтобы получить разбор — перейдите по ссылке «Забрать в Telegram» со страницы результата.",
      );
    } catch (e) {
      console.error("[bot] ошибка message:", e);
    }
  });

  // bot.launch() резолвится только при остановке бота — НЕ await-аем.
  bot.launch().catch((e) => {
    console.error("[bot] launch error:", e);
    process.exit(1);
  });
  console.log(`[bot] up: @${env.TELEGRAM_BOT_USERNAME}`);

  process.once("SIGTERM", () => bot.stop("SIGTERM"));
  process.once("SIGINT", () => bot.stop("SIGINT"));
}

// Запускаем бота только при прямом старте процесса (не при импорте для тестов).
if (process.argv[1]?.includes("bot/index")) {
  main().catch((e) => {
    console.error("[bot] фатально:", e);
    process.exit(1);
  });
}
