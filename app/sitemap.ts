import type { MetadataRoute } from "next";

// sitemap.xml для индексации в Google/Яндексе. Только публичные канонические
// страницы (разборы /a/ — одноразовые, не индексируем). Будущие статьи под
// боль-запросы добавятся сюда же (Фаза 3 / контент-канал).
const SITE = "https://getrazbor.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
