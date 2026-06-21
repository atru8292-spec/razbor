import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Блог — разбираем, почему сайты теряют заявки",
  description:
    "Статьи о том, почему сайт не приносит заявки и как это починить: первый экран, доверие, форма, мобильная версия. Простым языком, без воды.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/blog",
    siteName: "Razbor",
    title: "Блог Razbor — почему сайты теряют заявки",
    description: "Разбираем, почему сайт не приносит заявки и как это починить. Простым языком.",
    images: [{ url: "/example-report.png", width: 1200, height: 630, alt: "Блог Razbor" }],
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-[760px] px-6 pb-20 pt-14 sm:pt-20">
        <h1 className="font-display text-[2.25rem] font-black leading-[1.02] tracking-[-0.02em] text-ink sm:text-[3.25rem]">
          Блог
        </h1>
        <p className="mt-5 max-w-[560px] font-sans text-lg leading-relaxed text-ink-soft">
          Разбираем, почему сайты теряют заявки и как это чинить. Первый экран, доверие, форма,
          телефон — простым языком, без воды.
        </p>

        {posts.length === 0 ? (
          <p className="mt-16 font-sans text-ink-soft">Скоро здесь появятся статьи.</p>
        ) : (
          <div className="mt-12 divide-y divide-line border-t border-line">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group block py-8">
                <div className="flex items-center gap-2 font-sans text-xs uppercase tracking-[0.12em] text-ink-soft">
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span aria-hidden>·</span>
                  <span>{p.readingMinutes} мин</span>
                </div>
                <h2 className="mt-3 font-display text-xl font-extrabold leading-snug tracking-[-0.01em] text-ink transition group-hover:text-oxblood sm:text-2xl">
                  {p.title}
                </h2>
                <p className="mt-3 max-w-[620px] font-sans text-[1.0625rem] leading-relaxed text-ink-soft">
                  {p.description}
                </p>
                <span className="mt-4 inline-block font-sans text-sm font-medium text-oxblood">
                  Читать →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
