import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

// sitemap.xml для индексации в Google/Яндексе. Только публичные канонические
// страницы (разборы /a/ — одноразовые, не индексируем). Статьи блога под
// боль-запросы добавляются автоматически из content-blog.
const SITE = "https://getrazbor.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const posts = getAllPosts().map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(`${p.date}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...posts,
    { url: `${SITE}/policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
