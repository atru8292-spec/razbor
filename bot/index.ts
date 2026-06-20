// Telegram-бот выдачи подарка (отдельный pm2-процесс, разделы 11–12 ТЗ).
// Бот НЕ может писать первым — пользователь приходит по диплинку t.me/BOT?start=<lead.id>.
// По токену находим лид и отдаём подарок + ссылку на отчёт. Follow-up сообщения — Шаг 8.
import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { env } from "../lib/env";
import { getSupabase } from "../lib/supabase";
import { giftUrl, reportUrl, logDelivery } from "../lib/delivery";
import { logEvent, logBotMessage } from "../lib/events";
import { botText } from "../lib/followup";

// Кнопки активного пути по воронке (BOT.md часть 1). Нажатие шлёт контент касания
// сразу и двигает followup_stage → расписание это касание повторно НЕ шлёт.
const ARINA_URL = "https://t.me/arinashrr";
const STEP_LABEL: Record<1 | 2 | 3, string> = {
  1: "🔍 Главная проблема сайта",
  2: "📋 Что чинить первым",
  3: "💬 Разобрать сайт лично",
};
const ENGAGED_STATUSES = new Set(["engaged", "replied", "client"]);

// Кнопки на следующие шаги (> stage). Нет, если всё пройдено или человек уже
// написал живое сообщение (откликнулся) — дальше живой диалог, не мусорим.
function stepButtons(stage: number, status: string | null) {
  if (status && ENGAGED_STATUSES.has(status)) return undefined;
  const steps = ([1, 2, 3] as const).filter((n) => n > stage);
  if (!steps.length) return undefined;
  return Markup.inlineKeyboard(steps.map((n) => [Markup.button.callback(STEP_LABEL[n], `fu_${n}`)]));
}

async function topPriorities(auditId: string): Promise<string[]> {
  const { data } = await getSupabase().from("audits").select("result").eq("id", auditId).single();
  return (data?.result as { top_priorities?: string[] } | null)?.top_priorities ?? [];
}

// Касание 0 в боте (REDESIGN §9): живо, с тизером следующего касания.
// token = lead.id; chatId сохраняем в events(tg_started) для telegram-догонов.
interface BotReply {
  text: string;
  extra: Record<string, unknown>;
}
const NO_PREVIEW = { link_preview_options: { is_disabled: true } };

export async function handleStart(token: string | undefined, chatId?: number, username?: string): Promise<BotReply> {
  if (!token) {
    return {
      text: "Это бот сервиса RAZBOR. Чтобы забрать разбор и подарок — перейдите по ссылке со страницы результата.",
      extra: NO_PREVIEW,
    };
  }
  const { data: lead } = await getSupabase()
    .from("leads")
    .select("id, audit_id, followup_stage, status")
    .eq("id", token)
    .single();
  if (!lead || !lead.audit_id) {
    return {
      text: "Не нашли ваш разбор по ссылке. Откройте результат на сайте и нажмите «Забрать в Telegram» ещё раз.",
      extra: NO_PREVIEW,
    };
  }

  // сохраняем chat_id для будущих касаний + лог выдачи (без дублей)
  if (chatId != null) {
    await logEvent("tg_started", { auditId: lead.audit_id, leadId: lead.id, meta: { chat_id: chatId } });
  }
  // Короткий гейт (GATE.md): тг получаем автоматом из Telegram → второй канал у лида
  // (почта из формы + telegram отсюда), без ручного ввода ника.
  if (username) {
    await getSupabase().from("leads").update({ telegram: username }).eq("id", lead.id);
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

  const reply = [
    "Готово, разбор у вас на руках 👇",
    "",
    `📊 Разбор: ${reportUrl(lead.audit_id)}`,
    `📄 Чек-лист «Где сайт теряет заявки»: ${giftUrl()}`,
    "",
    "Гляньте разбор — там видно, где утекают заявки и что чинить первым.",
    "Хотите — могу прямо сейчас разобрать главное. Жмите кнопку:",
  ].join("\n");
  await logBotMessage(lead.id, "out", reply, chatId); // касание 0 в ленту переписки

  const buttons = stepButtons(lead.followup_stage ?? 0, lead.status);
  return { text: reply, extra: { ...NO_PREVIEW, ...(buttons ?? {}) } };
}

/** Находит лид по chat_id (через tg_started). null, если человек не приходил по диплинку. */
async function leadIdByChat(chatId: number): Promise<string | null> {
  const { data } = await getSupabase()
    .from("events")
    .select("lead_id")
    .eq("step", "tg_started")
    .filter("meta->>chat_id", "eq", String(chatId))
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.lead_id ?? null;
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
      const { text, extra } = await handleStart(token, ctx.chat?.id, ctx.from?.username);
      await ctx.reply(text, extra);
    } catch (e) {
      console.error("[bot] ошибка /start:", e);
      await ctx.reply("Что-то пошло не так. Попробуйте ещё раз чуть позже.");
    }
  });

  // Кнопки воронки (BOT.md часть 1): нажатие шлёт контент касания сразу и двигает
  // followup_stage → расписание это касание повторно не пришлёт (единый источник правды).
  bot.action(/^fu_([123])$/, async (ctx) => {
    try {
      const n = Number(ctx.match[1]) as 1 | 2 | 3;
      const chatId = ctx.chat?.id;
      const leadId = chatId != null ? await leadIdByChat(chatId) : null;
      if (!leadId) {
        await ctx.answerCbQuery("Не нашли ваш разбор. Откройте бота по ссылке со страницы результата.");
        return;
      }
      const { data: lead } = await getSupabase()
        .from("leads")
        .select("id, audit_id, followup_stage, status")
        .eq("id", leadId)
        .single();
      if (!lead || !lead.audit_id) {
        await ctx.answerCbQuery();
        return;
      }

      // топ-1 → касание 1, топ-2 → касание 2 (как в расписании, docs/VOICE.md)
      const tp = await topPriorities(lead.audit_id);
      const finding = n === 1 ? tp[0] ?? null : n === 2 ? tp[1] ?? null : null;
      const text = botText(n, { reportUrl: reportUrl(lead.audit_id), finding });

      const newStage = Math.max(lead.followup_stage ?? 0, n);
      // касание 3 «разобрать лично» → кнопка-ссылка на Арину, дальше кнопок нет
      const followBtns =
        n === 3
          ? Markup.inlineKeyboard([[Markup.button.url("💬 Написать Арине", ARINA_URL)]])
          : stepButtons(newStage, lead.status);

      await ctx.reply(text, { ...NO_PREVIEW, ...(followBtns ?? {}) });
      await logBotMessage(leadId, "out", text, chatId); // не auto — нажал сам
      await getSupabase().from("leads").update({ followup_stage: newStage }).eq("id", leadId);
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[bot] ошибка кнопки воронки:", e);
      await ctx.answerCbQuery();
    }
  });

  // Любое сообщение (не /start) = человек ответил → стоп цепочки + передаём Арине.
  // Пишем входящее и исходящее в переписку (часть H) — видна в карточке лида.
  bot.on("message", async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      const leadId = await leadIdByChat(chatId);
      const incoming = "text" in ctx.message ? ctx.message.text : "[нетекстовое сообщение]";
      await logBotMessage(leadId, "in", incoming, chatId);

      if (leadId) {
        await getSupabase().from("leads").update({ status: "engaged" }).eq("id", leadId);
      }

      const reply = leadId
        ? "Спасибо, что написали! Передаю Арине — она ответит и подскажет по вашему сайту."
        : "Чтобы получить разбор — перейдите по ссылке «Забрать в Telegram» со страницы результата.";
      await logBotMessage(leadId, "out", reply, chatId);
      await ctx.reply(reply);
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
