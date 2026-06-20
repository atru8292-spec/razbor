import type { MetadataRoute } from "next";

// robots.txt (SEO/AEO фундамент). Пускаем поисковики И AI-краулеров — нам нужна
// видимость в нейропоиске (ChatGPT, Perplexity, Яндекс Нейро). Закрываем приватное
// и одноразовые страницы разборов (/a/, /print) от индексации.
const SITE = "https://getrazbor.ru";
const DISALLOW = ["/admin", "/api/", "/a/", "/print/", "/gift/"];

// Явно перечисляем AI-ботов — документируем намерение пускать их (gpt/perplexity/
// claude/google-extended/yandex), чтобы случайные дефолты не отрезали нейропоиск.
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-Web",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "YandexBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
