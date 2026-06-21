import type { ReactNode } from "react";
import Link from "next/link";
import type { Block, FaqItem } from "@/lib/blog";

// Рендер тела статьи из распарсенных блоков. Одна колонка, фирменная типографика
// (Unbounded в заголовках, Manrope в тексте, высокий контраст ink на бумаге).
// Инлайн-разметка: **жирный**, *курсив*, [текст](url). Сырого HTML нет — безопасно.

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-ink">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      const href = m[3];
      const external = /^https?:/.test(href) && !href.includes("getrazbor.ru");
      nodes.push(
        <a
          key={key++}
          href={href}
          className="font-medium text-oxblood underline decoration-oxblood/30 underline-offset-2 transition hover:decoration-oxblood"
          {...(external ? { target: "_blank", rel: "noopener" } : {})}
        >
          {m[2]}
        </a>,
      );
    } else if (m[4] !== undefined) {
      nodes.push(<em key={key++}>{m[4]}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderBlock(block: Block, i: number): ReactNode {
  switch (block.type) {
    case "h2":
      return (
        <h2
          key={i}
          className="mt-14 scroll-mt-24 font-display text-[1.5rem] font-extrabold leading-tight tracking-[-0.01em] text-ink sm:text-[1.8rem]"
        >
          {inline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} className="mt-10 font-display text-xl font-bold text-ink">
          {inline(block.text)}
        </h3>
      );
    case "p":
      return (
        <p key={i} className="mt-5 text-[1.0625rem] leading-[1.75] text-ink sm:text-[1.15rem]">
          {inline(block.text)}
        </p>
      );
    case "ol":
      return (
        <ol key={i} className="mt-6 space-y-3">
          {block.items.map((it, j) => (
            <li
              key={j}
              className="flex gap-4 text-[1.0625rem] leading-[1.7] text-ink sm:text-[1.15rem]"
            >
              <span className="mt-0.5 font-display text-base font-bold text-oxblood">{j + 1}</span>
              <span>{inline(it)}</span>
            </li>
          ))}
        </ol>
      );
    case "ul":
      return (
        <ul key={i} className="mt-6 space-y-3">
          {block.items.map((it, j) => (
            <li
              key={j}
              className="flex gap-4 text-[1.0625rem] leading-[1.7] text-ink sm:text-[1.15rem]"
            >
              <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-oxblood" />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <p key={i} className="mt-10 text-center text-base italic leading-[1.7] text-ink-soft">
          {inline(block.text)}
        </p>
      );
    case "hr":
      return <hr key={i} className="mt-12 border-0 border-t border-line" />;
  }
}

function MidCta() {
  return (
    <aside className="my-12 rounded-2xl bg-paper-2 px-6 py-6">
      <p className="text-[1.0625rem] leading-relaxed text-ink">
        Хотите узнать, где именно теряет заявки <strong className="font-semibold">ваш</strong> сайт?{" "}
        <Link
          href="/#audit"
          className="font-semibold text-oxblood underline decoration-oxblood/30 underline-offset-2 hover:decoration-oxblood"
        >
          Запустите бесплатный разбор
        </Link>{" "}
        — пара минут, без регистрации.
      </p>
    </aside>
  );
}

function EndCta() {
  return (
    <aside className="mt-16 rounded-[20px] bg-oxblood px-7 py-9 text-paper">
      <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
        Узнайте, где ваш сайт теряет заявки
      </p>
      <p className="mt-3 text-[1.0625rem] leading-relaxed text-paper/85">
        Вставьте ссылку — за пару минут покажем по элементам вашего сайта, где уходят клиенты, и что
        чинить первым. Бесплатно, без регистрации.
      </p>
      <Link
        href="/#audit"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3 font-display text-sm font-bold text-oxblood transition hover:bg-paper-2"
      >
        Проверить сайт бесплатно →
      </Link>
    </aside>
  );
}

function FaqSection({ faq }: { faq: FaqItem[] }) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-[1.5rem] font-extrabold tracking-[-0.01em] text-ink sm:text-[1.8rem]">
        Частые вопросы
      </h2>
      <div className="mt-6 divide-y divide-line border-t border-line">
        {faq.map(({ q, a }) => (
          <div key={q} className="py-6">
            <h3 className="font-display text-lg font-bold text-ink">{q}</h3>
            <p className="mt-2 text-[1.0625rem] leading-[1.7] text-ink-soft">{inline(a)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Индекс заголовка, ближайшего к середине статьи, — туда вставляем mid-CTA
// (между разделами, не внутри абзаца). -1 если подходящего нет.
function midCtaIndex(blocks: Block[]): number {
  const headings = blocks
    .map((b, i) => (b.type === "h2" ? i : -1))
    .filter((i) => i > 0);
  if (headings.length < 2) return -1;
  const mid = blocks.length / 2;
  return headings.reduce((best, i) =>
    Math.abs(i - mid) < Math.abs(best - mid) ? i : best,
  );
}

export default function ArticleBody({ blocks, faq }: { blocks: Block[]; faq: FaqItem[] }) {
  const ctaAt = midCtaIndex(blocks);
  return (
    <>
      {blocks.map((b, i) => (
        <div key={i}>
          {i === ctaAt && <MidCta />}
          {renderBlock(b, i)}
        </div>
      ))}
      {faq.length > 0 && <FaqSection faq={faq} />}
      <EndCta />
    </>
  );
}
