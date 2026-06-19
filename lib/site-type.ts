// Определение типа сайта и ниши лёгкой моделью (раздел 4 ТЗ). Некритично:
// при сбое возвращаем дефолт, аудит продолжается (тип влияет только на лензу).
import { createJsonResponse, extractJson } from "./openai";
import { env } from "./env";
import type { ExtractedData } from "./scrape-types";

export type SiteType = "ecommerce" | "leadgen" | "saas" | "info" | "local";
const TYPES: SiteType[] = ["ecommerce", "leadgen", "saas", "info", "local"];

export interface SiteClassification {
  site_type: SiteType;
  niche: string | null;
}

const SYSTEM =
  "Ты классификатор сайтов. По данным определи тип и нишу. " +
  "Тип строго один из: ecommerce (интернет-магазин), leadgen (сбор заявок/услуги), " +
  "saas (онлайн-сервис/подписка), info (контент/инфопродукт), local (локальная услуга/заведение). " +
  'Верни строго JSON: {"site_type":"...","niche":"короткая ниша на русском"}.';

export async function classifySite(url: string, e: ExtractedData): Promise<SiteClassification> {
  try {
    const input = [
      `URL: ${url}`,
      `Title: ${e.title}`,
      `Description: ${e.metaDescription ?? ""}`,
      `H1: ${e.headings.h1.join(" | ")}`,
      `H2: ${e.headings.h2.slice(0, 8).join(" | ")}`,
      `Кнопки: ${e.buttons.slice(0, 12).join(" | ")}`,
      `Формы: ${e.forms.length}`,
      `Текст (фрагмент): ${e.visibleText.slice(0, 1500)}`,
    ].join("\n");

    const { text } = await createJsonResponse({
      model: env.OPENAI_LIGHT_MODEL,
      system: SYSTEM,
      userText: input,
    });

    const parsed = extractJson(text || "{}") as Partial<SiteClassification>;
    const site_type = TYPES.includes(parsed.site_type as SiteType) ? (parsed.site_type as SiteType) : "leadgen";
    return { site_type, niche: typeof parsed.niche === "string" ? parsed.niche : null };
  } catch (err) {
    console.error("[site-type] классификация не удалась, дефолт leadgen:", err);
    return { site_type: "leadgen", niche: null };
  }
}
