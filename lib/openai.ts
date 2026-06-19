// Клиент OpenAI (раздел 15/17 ТЗ). Прямой ключ владельца, вызовы с VPS.
// Новые модели (gpt-5.x) работают через Responses API (v1/responses), а не chat/completions.
import OpenAI from "openai";
import { requireEnv } from "./env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }
  return client;
}

export interface JsonResponse {
  text: string;
  usage: { prompt: number; completion: number } | null;
}

/**
 * Запрос с JSON-ответом через Responses API. Опционально передаём картинки (jpeg base64).
 * Системный промпт идёт первым → попадает в prompt-cache OpenAI (раздел 15).
 */
export async function createJsonResponse(params: {
  model: string;
  system: string;
  userText: string;
  imagesB64?: string[];
}): Promise<JsonResponse> {
  const content: OpenAI.Responses.ResponseInputMessageContentList = [
    { type: "input_text", text: params.userText },
  ];
  for (const b64 of params.imagesB64 ?? []) {
    content.push({ type: "input_image", image_url: `data:image/jpeg;base64,${b64}`, detail: "high" });
  }

  const resp = await getOpenAI().responses.create({
    model: params.model,
    input: [
      { role: "system", content: params.system },
      { role: "user", content },
    ],
    text: { format: { type: "json_object" } },
  });

  const usage = resp.usage
    ? { prompt: resp.usage.input_tokens ?? 0, completion: resp.usage.output_tokens ?? 0 }
    : null;
  return { text: resp.output_text ?? "", usage };
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
