import Link from "next/link";
import UrlForm from "@/components/UrlForm";
import Tag from "@/components/ui/Tag";
import Reveal from "@/components/ui/Reveal";

// Лендинг (REDESIGN §5/6): brutalism, фокус на продукте, живой пример разбора.
const OWNER = "https://t.me/arinashrr";

const DIRECTIONS = [
  "Ценность и оффер",
  "Первый экран за 5 секунд",
  "Структура и логика воронки",
  "Доверие и возражения",
  "Путь к заявке и трение",
  "Мобайл и удобство",
  "Скорость и техника",
  "ИИ-видимость в нейропоиске",
];

export default function Home() {
  return (
    <main className="mx-auto max-w-[1200px] px-6">
      {/* хедер */}
      <header className="flex items-center justify-between border-b border-line py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="RAZBOR" className="h-7 w-auto" />
        <span className="font-sans text-xs uppercase tracking-[0.18em] text-ink-soft">Аудит сайтов</span>
      </header>

      {/* hero */}
      <section className="pt-20 sm:pt-28">
        <Tag>AI-аудит за пару минут</Tag>
        <h1 className="mt-6 font-display font-black leading-[0.95] tracking-[-0.02em] text-ink" style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
          Видно, где сайт <span className="text-oxblood">теряет</span> заявки
        </h1>
        <p className="mt-7 max-w-[600px] font-sans text-lg leading-relaxed text-ink-soft sm:text-xl">
          Вставьте ссылку — покажем по элементам вашего сайта, где и почему уходят клиенты.
          С оценками конверсии, удобства и планом, что чинить первым.
        </p>
        <div id="audit" className="mt-10 scroll-mt-24">
          <UrlForm />
        </div>
      </section>

      {/* живой пример разбора — главное доказательство */}
      <Reveal className="mt-32 sm:mt-40">
        <section>
          <h2 className="font-display font-extrabold leading-[1.0] text-ink" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
            Вот как выглядит разбор
          </h2>
          <p className="mt-4 max-w-[600px] font-sans text-lg text-ink-soft">
            Не абстракция: оценки, главная утечка, силы LIFT и приоритеты — по вашему сайту.
          </p>
          <div className="mt-10 border border-line bg-white p-2 shadow-[0_8px_30px_rgba(78,0,0,0.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/example-report.png" alt="Пример разбора сайта" loading="lazy" className="w-full" />
          </div>
          <div className="mt-10">
            <Link href="#audit" className="inline-block bg-oxblood px-7 py-4 font-display text-base font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep">
              Проверить свой сайт
            </Link>
          </div>
        </section>
      </Reveal>

      {/* что внутри разбора — 8 направлений в две колонки */}
      <Reveal className="mt-32 sm:mt-40">
        <section>
          <Tag>Что внутри разбора</Tag>
          <h2 className="mt-5 font-display font-extrabold leading-[1.0] text-ink" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
            8 направлений, по которым теряются заявки
          </h2>
          <ol className="mt-10 grid gap-x-12 gap-y-5 sm:grid-cols-2">
            {DIRECTIONS.map((d, i) => (
              <li key={d} className="flex items-baseline gap-4 border-b border-line pb-4">
                <span className="font-display text-xl font-black text-oxblood">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-sans text-lg text-ink">{d}</span>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* AEO — акцент-крючок (не основная услуга) */}
      <Reveal className="mt-32 sm:mt-40">
        <section className="border-y-2 border-oxblood/20 py-14">
          <Tag>Новое</Tag>
          <p className="mt-5 max-w-3xl font-display font-extrabold leading-[1.1] text-ink" style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}>
            Сейчас людей ищут через нейросети. Проверим, <span className="text-oxblood">видит ли вас ИИ-поиск</span> — ChatGPT, Алиса, Яндекс Нейро.
          </p>
          <p className="mt-5 max-w-[600px] font-sans text-lg text-ink-soft">
            Нейропоиск отвечает готовыми рекомендациями — и если сайт ему непонятен, вас там просто нет.
            Покажем, видят ли вас и как туда попасть. Это часть разбора — вместе с конверсией и удобством.
          </p>
        </section>
      </Reveal>

      {/* как это работает — 3 шага */}
      <Reveal className="mt-32 sm:mt-40">
        <section>
          <Tag>Как это работает</Tag>
          <div className="mt-10 grid gap-12 sm:grid-cols-3">
            {[
              { n: "01", t: "Вставьте ссылку", d: "Любой сайт — лендинг, магазин, услуги. Tilda и тяжёлые тоже." },
              { n: "02", t: "AI-разбор за пару минут", d: "Снимаем сайт, считаем метрики, сравниваем с конкурентами." },
              { n: "03", t: "План правок", d: "Где теряются заявки и что чинить первым — по приоритету." },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-display text-5xl font-black text-oxblood">{s.n}</div>
                <h3 className="mt-3 font-display text-xl font-extrabold text-ink">{s.t}</h3>
                <p className="mt-2 font-sans text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* финальный CTA full-bleed */}
      <section className="mt-32 bg-oxblood px-8 py-20 text-center sm:mt-40">
        <h2 className="font-display font-black text-paper" style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}>
          Проверь свой сайт
        </h2>
        <p className="mx-auto mt-4 max-w-md font-sans text-paper/80">Бесплатно, за пару минут. Узнайте, где уходят заявки.</p>
        <Link href="#audit" className="mt-8 inline-block bg-paper px-8 py-4 font-display text-base font-bold uppercase tracking-wide text-oxblood transition hover:bg-paper-2">
          Проверить сайт
        </Link>
      </section>

      {/* футер */}
      <footer className="flex flex-col gap-3 border-t border-line py-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-sm font-bold uppercase tracking-[0.3em] text-oxblood">RAZBOR</span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-sans text-sm text-ink-soft">
          <span>AI-аудит сайтов</span>
          <a href={OWNER} target="_blank" rel="noopener" className="hover:text-oxblood">
            Telegram @arinashrr
          </a>
          <Link href="/policy" className="hover:text-oxblood">
            Политика
          </Link>
        </div>
      </footer>

      {/* sticky-CTA на мобайле */}
      <Link
        href="#audit"
        className="fixed inset-x-0 bottom-0 z-40 block bg-oxblood py-4 text-center font-display text-sm font-bold uppercase tracking-wide text-paper shadow-[0_-4px_20px_rgba(78,0,0,0.15)] sm:hidden"
      >
        Проверить сайт
      </Link>
      <div className="h-16 sm:hidden" />
    </main>
  );
}
