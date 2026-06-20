import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";

// Заголовки — Unbounded, текст — Manrope (docs/DESIGN.md). Кириллица + латиница.
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const SITE = "https://getrazbor.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Razbor — AI-аудит сайта: где вы теряете заявки",
    template: "%s — Razbor",
  },
  // Описание языком боли клиента + ключ «аудит сайта» (не только термин).
  description:
    "Razbor — бесплатный AI-аудит сайта за пару минут. Покажем, почему сайт не приносит заявки и где вы теряете клиентов, и что чинить первым.",
  keywords: [
    "аудит сайта",
    "проверить сайт",
    "почему сайт не приносит заявки",
    "мало заявок с сайта",
    "почему люди уходят с сайта",
    "проверить сайт на конверсию",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE,
    siteName: "Razbor",
    title: "Razbor — AI-аудит сайта: где вы теряете заявки",
    description: "Бесплатно за пару минут покажем, почему сайт не приносит заявки и что чинить первым.",
    images: [{ url: "/example-report.png", width: 1200, height: 630, alt: "Пример AI-разбора сайта Razbor" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Razbor — AI-аудит сайта: где вы теряете заявки",
    description: "Бесплатно за пару минут покажем, почему сайт не приносит заявки.",
    images: ["/example-report.png"],
  },
  // Подтверждение прав в Яндекс.Вебмастер / Google Search Console — токены из env
  // (вставит хозяйка после регистрации; пусто = тег не выводится).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
