import Link from "next/link";

// Общий футер для блога — в том же стиле, что на главной, + ссылка на блог.
const WRAP = "mx-auto max-w-[1200px] px-6";
const OWNER = "https://t.me/arinashrr";

export default function SiteFooter() {
  return (
    <footer
      className={`${WRAP} flex flex-col gap-3 border-t border-line py-8 sm:flex-row sm:items-center sm:justify-between`}
    >
      <span className="font-display text-sm font-bold uppercase tracking-[0.3em] text-oxblood">RAZBOR</span>
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-sans text-sm text-ink-soft">
        <Link href="/blog" className="hover:text-oxblood">
          Блог
        </Link>
        <a href={OWNER} target="_blank" rel="noopener" className="hover:text-oxblood">
          Telegram @arinashrr
        </a>
        <Link href="/policy" className="hover:text-oxblood">
          Политика
        </Link>
      </div>
    </footer>
  );
}
