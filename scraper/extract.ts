import type { ExtractedData } from "../lib/scrape-types";

/**
 * Извлечение из отрисованного DOM. Выполняется В БРАУЗЕРЕ через page.evaluate,
 * поэтому функция самодостаточна и использует только браузерные API.
 */
export function domExtractor(opts: { textLimit: number; listLimit: number }): ExtractedData {
  const { textLimit, listLimit } = opts;

  const textOf = (el: Element | null): string =>
    (el?.textContent ?? "").replace(/\s+/g, " ").trim();

  const collect = (sel: string): string[] =>
    Array.from(document.querySelectorAll(sel))
      .map((el) => textOf(el))
      .filter((t) => t.length > 0)
      .slice(0, listLimit);

  // Кнопки и CTA-подобные ссылки.
  const buttonNodes = Array.from(
    document.querySelectorAll(
      'button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button, a[class*="btn"], a[class*="button"]',
    ),
  );
  const buttons = Array.from(
    new Set(
      buttonNodes
        .map((el) => {
          if (el instanceof HTMLInputElement) return el.value.trim();
          return textOf(el);
        })
        .filter((t) => t.length > 0 && t.length < 120),
    ),
  ).slice(0, listLimit);

  // Формы.
  const forms = Array.from(document.querySelectorAll("form"))
    .slice(0, listLimit)
    .map((form) => {
      const inputs = Array.from(form.querySelectorAll("input, textarea, select"));
      return {
        fieldCount: inputs.length,
        fields: inputs.slice(0, 30).map((i) => ({
          type:
            i instanceof HTMLInputElement
              ? i.type
              : i.tagName.toLowerCase(),
          name: (i as HTMLInputElement).name || null,
        })),
      };
    });

  // schema.org: JSON-LD + microdata.
  const schemaTypes = new Set<string>();
  for (const node of Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  )) {
    try {
      const parsed = JSON.parse(node.textContent || "");
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const obj of arr) {
        const t = obj && obj["@type"];
        if (typeof t === "string") schemaTypes.add(t);
        else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && schemaTypes.add(x));
      }
    } catch {
      // битый JSON-LD игнорируем
    }
  }
  for (const node of Array.from(document.querySelectorAll("[itemtype]"))) {
    const it = node.getAttribute("itemtype");
    if (it) schemaTypes.add(it.split("/").pop() || it);
  }

  const visibleText = (document.body?.innerText ?? "")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, textLimit);

  // Телефон: tel:-ссылка приоритетнее, иначе грубый regex по тексту.
  let phone: string | null = null;
  const telLink = document.querySelector('a[href^="tel:"]');
  if (telLink) {
    phone = (telLink.getAttribute("href") || "").replace(/^tel:/, "").trim() || null;
  } else {
    const m = visibleText.match(/(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/);
    phone = m ? m[0].trim() : null;
  }

  return {
    title: document.title || "",
    metaDescription:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() || null,
    lang: document.documentElement.getAttribute("lang") || null,
    headings: { h1: collect("h1"), h2: collect("h2"), h3: collect("h3") },
    buttons,
    forms,
    visibleText,
    hasSchema: schemaTypes.size > 0,
    schemaTypes: Array.from(schemaTypes).slice(0, 30),
    phone,
    imageCount: document.images.length,
    videoCount: document.querySelectorAll("video").length,
  };
}
