import type { ReactNode } from "react";

// Лёгкий рендер ответа AI-маркетолога (часть E): модель отдаёт markdown
// (### заголовки, **жирный**, - списки). Превращаем в аккуратный текст по
// дизайн-системе, без сырых #/* наружу. Без зависимостей.
function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(/\*\*/).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyBase}-${i}`} className="font-semibold text-espresso">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export default function AnalysisText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-2 ml-5 list-disc space-y-1 text-espresso/85">
        {items.map((it, i) => (
          <li key={i}>{inline(it, `ul-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  text.split("\n").forEach((raw, idx) => {
    const line = raw.trim();
    const heading = line.match(/^#{2,4}\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (heading) {
      flushList();
      blocks.push(
        <h3 key={`h-${idx}`} className="mt-4 font-display text-base font-bold text-oxblood first:mt-0">
          {inline(heading[1], `h-${idx}`)}
        </h3>,
      );
    } else if (bullet) {
      list.push(bullet[1]);
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${idx}`} className="mt-2 text-espresso/85 first:mt-0">
          {inline(line, `p-${idx}`)}
        </p>,
      );
    }
  });
  flushList();

  return <div className="font-sans text-[0.95rem] leading-relaxed">{blocks}</div>;
}
