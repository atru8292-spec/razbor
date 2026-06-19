// Поиск конкурентов через встроенный веб-поиск OpenAI (раздел 9 ТЗ).
// Возвращает 3–5 кандидатов {name, url}. Снятие — отдельно, в пайплайне.
import type OpenAI from "openai";
import { getOpenAI, extractJson } from "./openai";
import { env } from "./env";
import { config } from "./config";

// Рантайм OpenAI принимает новый тул "web_search"; типы SDK 4.104 знают только
// "web_search_preview" — кастуем (проверено живым вызовом, возвращает url_citation).
const WEB_SEARCH_TOOL = [{ type: "web_search" }] as unknown as OpenAI.Responses.Tool[];

export interface CompetitorLink {
  name: string;
  url: string;
}

// Каталоги, маркетплейсы, карты, соцсети — это не конкуренты, отсекаем (раздел 9).
const BLOCKLIST = [
  "avito.",
  "2gis.",
  "2gis.ru",
  "yandex.",
  "ya.ru",
  "google.",
  "maps.",
  "booking.com",
  "ostrovok.",
  "tripadvisor.",
  "tonkosti.",
  "tourister.",
  "ozon.",
  "wildberries.",
  "market.yandex",
  "vk.com",
  "t.me",
  "instagram.",
  "facebook.",
  "zoon.",
  "flamp.",
  "yell.",
  "restoclub.",
  "tutu.",
  "sutochno.",
  "youtube.",
  "wikipedia.",
];

function cleanUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.search = ""; // снимаем ?utm_source=openai и прочий трекинг
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlocked(url: string): boolean {
  const host = hostOf(url);
  return BLOCKLIST.some((b) => host.includes(b.replace(/\.$/, "")));
}

/** Достаёт url_citation из output Responses API (ссылки веб-поиска с источниками). */
function citationUrls(resp: unknown): string[] {
  const out: string[] = [];
  const output = (resp as { output?: unknown[] }).output ?? [];
  for (const item of output) {
    const content = (item as { content?: { annotations?: { url?: string }[] }[] }).content ?? [];
    for (const part of content) {
      for (const a of part.annotations ?? []) {
        if (a.url) out.push(a.url);
      }
    }
  }
  return out;
}

/**
 * Ищет реальных прямых конкурентов в нише и гео. Мягко: при любой ошибке вернёт [].
 * Жёстко ограничивает до maxCompetitors.
 */
export async function findCompetitors(
  targetUrl: string,
  niche: string | null,
  geo: string | null,
): Promise<CompetitorLink[]> {
  if (!niche) return [];

  const targetHost = hostOf(targetUrl);
  const where = geo ? `в регионе: ${geo}` : "в России";
  const prompt =
    `Найди ${config.minCompetitors}-${config.maxCompetitors} реальных прямых конкурентов для бизнеса. ` +
    `Ниша: ${niche}. Гео: ${where}. ` +
    "Это должны быть ОФИЦИАЛЬНЫЕ САЙТЫ КОМПАНИЙ, а не каталоги, маркетплейсы, карты, агрегаторы или соцсети. " +
    'Верни СТРОГО JSON-массив объектов вида [{"name":"...","url":"https://..."}] и ничего больше.';

  let resp;
  try {
    resp = await getOpenAI().responses.create({
      model: env.OPENAI_SEARCH_MODEL,
      input: prompt,
      tools: WEB_SEARCH_TOOL,
    });
  } catch (e) {
    console.error("[competitors] веб-поиск не удался:", e);
    return [];
  }

  const text = resp.output_text ?? "";
  const links: CompetitorLink[] = [];

  // 1) пытаемся распарсить JSON-массив из ответа
  try {
    const parsed = extractJson(text);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const url = typeof item?.url === "string" ? cleanUrl(item.url) : null;
        if (url) links.push({ name: typeof item?.name === "string" ? item.name : hostOf(url), url });
      }
    }
  } catch {
    /* fallback ниже */
  }

  // 2) fallback: берём url_citation, если JSON не дал ссылок
  if (links.length === 0) {
    for (const raw of citationUrls(resp)) {
      const url = cleanUrl(raw);
      if (url) links.push({ name: hostOf(url), url });
    }
  }

  // фильтрация: блок-лист, целевой домен, дубли по хосту; жёсткий лимит
  const seen = new Set<string>();
  const result: CompetitorLink[] = [];
  for (const link of links) {
    const host = hostOf(link.url);
    if (!host || host === targetHost) continue;
    if (isBlocked(link.url)) continue;
    if (seen.has(host)) continue;
    seen.add(host);
    result.push(link);
    if (result.length >= config.maxCompetitors) break;
  }

  return result;
}
