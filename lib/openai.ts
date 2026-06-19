// Клиент OpenAI (раздел 15/17 ТЗ). Прямой ключ владельца, вызовы с VPS.
import OpenAI from "openai";
import { requireEnv } from "./env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }
  return client;
}

/** Достаёт первый JSON-объект из текста ответа (на случай обёрток/```json). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        /* fallthrough */
      }
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Не удалось разобрать JSON из ответа модели.");
  }
}
