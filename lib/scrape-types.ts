// Контракт скрапера. Общий тип: его импортирует и scraper/, и воркер на Шаге 4.

export interface Shot {
  /** base64 сжатого jpeg (без data: префикса) */
  base64: string;
  width: number;
  height: number;
  bytes: number;
}

export interface FormField {
  type: string;
  name: string | null;
}

export interface ScrapedForm {
  fieldCount: number;
  fields: FormField[];
}

/** Что извлекаем из отрисованного DOM (раздел 5 ТЗ). */
export interface ExtractedData {
  title: string;
  metaDescription: string | null;
  lang: string | null;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  /** Тексты кнопок и CTA-ссылок */
  buttons: string[];
  forms: ScrapedForm[];
  /** Видимый текст страницы, обрезанный до лимита */
  visibleText: string;
  hasSchema: boolean;
  schemaTypes: string[];
  phone: string | null;
  imageCount: number;
  videoCount: number;
}

/** AEO-сигналы (раздел 6.1): контент в HTML или прячется за клиентским рендером. */
export interface AeoSignals {
  /** есть ли JSON-LD/schema в сыром (без JS) ответе */
  hasSchemaInRaw: boolean;
  rawTextLength: number;
  renderedTextLength: number;
  /** rawTextLength / renderedTextLength: ~1 — серверный рендер, ~0 — всё на клиенте */
  serverRenderedRatio: number | null;
  /** удалось ли вообще получить сырой HTML */
  rawFetched: boolean;
}

export interface ScrapeResult {
  ok: true;
  requestedUrl: string;
  /** финальный URL после редиректов */
  finalUrl: string;
  httpStatus: number | null;
  desktop: Shot;
  mobile: Shot;
  renderedHtml: string;
  rawHtml: string | null;
  extracted: ExtractedData;
  aeo: AeoSignals;
  timingMs: number;
}

export type ScrapeErrorCode =
  | "invalid_url"
  | "ssrf_blocked"
  | "unreachable"
  | "timeout"
  | "blocked"
  | "internal";

export interface ScrapeErrorResult {
  ok: false;
  code: ScrapeErrorCode;
  error: string;
}
