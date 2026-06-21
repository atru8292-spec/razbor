import Link from "next/link";

// Общая шапка для блога (на главной — своя, форма прямо на экране).
const WRAP = "mx-auto max-w-[1200px] px-6";

export default function SiteHeader() {
  return (
    <header className={`${WRAP} flex items-center justify-between border-b border-line py-5`}>
      <Link href="/" aria-label="RAZBOR — на главную">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="RAZBOR" className="h-7 w-auto" />
      </Link>
      <nav className="flex items-center gap-5 font-sans text-sm sm:gap-6">
        <Link href="/blog" className="text-ink-soft transition hover:text-oxblood">
          Блог
        </Link>
        <Link
          href="/#audit"
          className="rounded-full bg-oxblood px-4 py-2 font-medium text-paper transition hover:bg-oxblood-deep"
        >
          Проверить сайт
        </Link>
      </nav>
    </header>
  );
}
