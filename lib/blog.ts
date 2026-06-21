// Блог: статьи — markdown-файлы в /content-blog с frontmatter. Свой лёгкий парсер
// (без remark/react-markdown) — деплой на VPS хрупкий на npm install, меньше
// зависимостей лучше, плюс полный контроль над типографикой бренда и безопасность
// (никакого сырого HTML). Поддерживаемый поднабор разметки держать дисциплинированно:
//   ## H2, ### H3, абзацы, **жирный**, *курсив*, [текст](url),
//   нумерованные (1.) и маркированные (-) списки, --- разделитель.
// Секция «## Частые вопросы» парсится отдельно → блок FAQ + FAQPage-schema.

import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content-blog");

export type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string } // одиночная *курсивная* строка (мягкий CTA в конце)
  | { type: "hr" };

export type FaqItem = { q: string; a: string };

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO YYYY-MM-DD
  readingMinutes: number;
};

export type Post = PostMeta & {
  blocks: Block[];
  faq: FaqItem[];
};

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// «19 июня 2026» — без new Date(), чтобы не словить сдвиг по таймзоне.
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function splitFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { data: {}, body: raw };
  const data: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      i++;
      break;
    }
    const m = lines[i].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      data[m[1]] = v;
    }
  }
  return { data, body: lines.slice(i).join("\n") };
}

function parseBody(body: string): { blocks: Block[]; faq: FaqItem[] } {
  const rawBlocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const blocks: Block[] = [];
  const faq: FaqItem[] = [];
  let inFaq = false;

  for (const b of rawBlocks) {
    // H1 из тела не рендерим — заголовок берём из frontmatter.
    if (b.startsWith("# ") && !b.startsWith("## ")) continue;

    if (b.startsWith("## ")) {
      const text = b.slice(3).trim();
      // Секцию FAQ выносим в отдельный блок (своя вёрстка + schema, рендерится в
      // конце). Любой её заголовок переключает режим.
      inFaq = /^частые вопросы|вопросы и ответы|^faq$/i.test(text);
      if (inFaq) continue;
      blocks.push({ type: "h2", text });
      continue;
    }

    if (b.startsWith("### ")) {
      blocks.push({ type: "h3", text: b.slice(4).trim() });
      continue;
    }

    // Внутри FAQ: берём только пары «**Вопрос?**\nОтвет», остальное (закрывающий
    // --- и мягкую *врезку*) глотаем — финальный CTA даёт EndCta.
    if (inFaq) {
      const nl = b.indexOf("\n");
      const first = (nl === -1 ? b : b.slice(0, nl)).trim();
      const rest = nl === -1 ? "" : b.slice(nl + 1).trim();
      const qm = first.match(/^\*\*(.+?)\*\*$/);
      if (qm) faq.push({ q: qm[1].trim(), a: rest });
      continue;
    }

    if (b === "---") {
      blocks.push({ type: "hr" });
      continue;
    }

    const lines = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l))) {
      blocks.push({ type: "ol", items: lines.map((l) => l.replace(/^\d+\.\s+/, "")) });
      continue;
    }
    if (lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l))) {
      blocks.push({ type: "ul", items: lines.map((l) => l.replace(/^[-*]\s+/, "")) });
      continue;
    }

    // Одиночная *курсивная* строка (не **жирная**) — мягкая врезка-CTA в конце статьи.
    if (/^\*[^*].*[^*]\*$/.test(b) && !b.startsWith("**")) {
      blocks.push({ type: "note", text: b.slice(1, -1).trim() });
      continue;
    }

    blocks.push({ type: "p", text: lines.join(" ") });
  }

  return { blocks, faq };
}

function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function parseFile(file: string): Post {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
  const { data, body } = splitFrontmatter(raw);
  const { blocks, faq } = parseBody(body);
  const slug = data.slug || file.replace(/\.md$/, "");
  return {
    slug,
    title: data.title || slug,
    description: data.description || "",
    date: data.date || "1970-01-01",
    readingMinutes: readingMinutes(body),
    blocks,
    faq,
  };
}

function listFiles(): string[] {
  try {
    return fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

// Все статьи (мета), новые сверху.
export function getAllPosts(): PostMeta[] {
  return listFiles()
    .map((f) => {
      const p = parseFile(f);
      const { slug, title, description, date, readingMinutes } = p;
      return { slug, title, description, date, readingMinutes };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

export function getPost(slug: string): Post | null {
  const file = listFiles().find((f) => parseFile(f).slug === slug);
  return file ? parseFile(file) : null;
}
