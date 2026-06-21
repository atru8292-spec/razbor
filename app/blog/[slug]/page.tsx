import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getAllSlugs, getPost, formatDate } from "@/lib/blog";
import ArticleBody from "@/components/blog/ArticleBody";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const SITE = "https://getrazbor.ru";

// Статьи редко меняются → статика (SSG), хорошо для скорости и SEO.
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `/blog/${slug}`;
  const ogImage = `${SITE}${url}/og`; // бренд-карточка с заголовком статьи (абсолютный https)
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "ru_RU",
      url,
      siteName: "Razbor",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [{ url: ogImage, alt: post.title }],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getAllPosts().filter((p) => p.slug !== slug).slice(0, 2);

  // Article + FAQPage JSON-LD (schema = ровно то, что на странице).
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "Razbor", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "Razbor",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${slug}` },
    image: `${SITE}/example-report.png`,
    inLanguage: "ru-RU",
  };

  const faqSchema =
    post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }
      : null;

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <SiteHeader />

      <article className="mx-auto max-w-[680px] px-6 pb-20 pt-12 sm:pt-16">
        <Link
          href="/blog"
          className="font-sans text-sm text-ink-soft transition hover:text-oxblood"
        >
          ← Все статьи
        </Link>

        <h1 className="mt-6 font-display text-[2rem] font-black leading-[1.05] tracking-[-0.02em] text-ink sm:text-[2.75rem]">
          {post.title}
        </h1>

        <div className="mt-5 flex items-center gap-2 font-sans text-sm text-ink-soft">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} мин чтения</span>
        </div>

        <div className="mt-8 border-t border-line pt-2" />

        <ArticleBody blocks={post.blocks} faq={post.faq} />

        {related.length > 0 && (
          <section className="mt-16 border-t border-line pt-8">
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-ink-soft">
              Читать дальше
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group rounded-2xl border border-line p-5 transition hover:border-oxblood"
                >
                  <h3 className="font-display text-base font-bold leading-snug text-ink group-hover:text-oxblood">
                    {p.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
                    {p.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <SiteFooter />
    </main>
  );
}
