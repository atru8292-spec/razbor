// Структурированные данные о сервисе (SEO/AEO фаза 2) — чтобы поисковики и нейросети
// понимали, что Razbor за продукт. Описание языком боли клиента, не только «аудит».
const SITE = "https://getrazbor.ru";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "Razbor",
      url: SITE,
      logo: `${SITE}/logo.svg`,
      description: "Сервис, который помогает понять, почему сайт не приносит заявки и где он теряет клиентов.",
      sameAs: ["https://t.me/arinashrr"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Razbor",
      description: "Бесплатный AI-аудит сайта: почему сайт не приносит заявки и что чинить первым.",
      inLanguage: "ru-RU",
      publisher: { "@id": `${SITE}/#org` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE}/#app`,
      name: "Razbor — AI-аудит сайта",
      url: SITE,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "AI-сервис проверяет сайт по ссылке и показывает, почему он не приносит заявки и где теряет клиентов: разбор по 8 направлениям, оценки и план правок по приоритету. Бесплатно, за пару минут, без регистрации.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
      featureList: [
        "Находит, где сайт теряет заявки и клиентов",
        "Оценки по 8 направлениям — от первого экрана до видимости в нейропоиске",
        "План правок по приоритету: что чинить первым",
        "Бесплатно, за пару минут, без регистрации",
      ],
      provider: { "@id": `${SITE}/#org` },
      inLanguage: "ru-RU",
    },
  ],
};

export default function SiteJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
