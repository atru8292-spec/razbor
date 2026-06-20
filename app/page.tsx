import Link from "next/link";
import UrlForm from "@/components/UrlForm";
import StickyCta from "@/components/StickyCta";
import SiteJsonLd from "@/components/SiteJsonLd";
import Tag from "@/components/ui/Tag";
import Reveal from "@/components/ui/Reveal";

// Лендинг (REDESIGN §5/6): brutalism, фокус на продукте, ритм фонов (§правка).
const OWNER = "https://t.me/arinashrr";
const WRAP = "mx-auto max-w-[1200px] px-6";

const DIRECTIONS = [
  "Ценность и предложение",
  "Первый экран за 5 секунд",
  "Структура страницы",
  "Доверие и сомнения",
  "Путь к заявке",
  "Телефон и удобство",
  "Скорость и техника",
  "Видны ли вы в нейропоиске",
];

// Стилизованное окно нейропоиска: попал ли сайт в ответ ИИ. Без реальных брендов.
function NeuroChatMockup() {
  return (
    <div className="rounded-[18px] bg-paper p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-oxblood" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-2 font-sans text-xs uppercase tracking-[0.18em] text-ink-soft">Нейропоиск</span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-paper-2 px-4 py-2.5 font-sans text-sm text-ink">
            Посоветуй глэмпинг со СПА в Туле
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-sans text-sm text-ink-soft">Вот подходящий вариант:</p>
          <div className="rounded-xl border-[1.5px] border-oxblood p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-base font-extrabold text-ink">Ива СПА</span>
              <span className="shrink-0 rounded bg-oxblood px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-paper">
                ✓ в ответе
              </span>
            </div>
            <p className="mt-1 font-sans text-xs text-ink-soft">Глэмпинг с термальным бассейном и СПА, Тульская область</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <SiteJsonLd />
      {/* хедер */}
      <header className={`${WRAP} flex items-center justify-between border-b border-line py-5`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="RAZBOR" className="h-7 w-auto" />
        <span className="font-sans text-xs uppercase tracking-[0.18em] text-ink-soft">Аудит сайтов</span>
      </header>

      {/* hero */}
      <section className={`${WRAP} pt-20 sm:pt-28`}>
        <Tag>AI-аудит за пару минут</Tag>
        <h1 className="mt-6 font-display font-black leading-[0.95] tracking-[-0.02em] text-ink" style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
          Видно, где сайт <span className="text-oxblood">теряет</span> заявки
        </h1>
        <p className="mt-7 max-w-[600px] font-sans text-lg leading-relaxed text-ink-soft sm:text-xl">
          Вставьте ссылку — покажем по элементам вашего сайта, где и почему уходят клиенты.
          С оценкой удобства, где теряете заявки, и планом, что чинить первым.
        </p>
        <div id="audit" className="mt-10 scroll-mt-24">
          <UrlForm />
          <p className="mt-3 font-sans text-sm text-ink-soft">Бесплатно. Результат за пару минут. Без регистрации.</p>
          <div className="mt-7 max-w-lg border-t border-line pt-6">
            <p className="font-sans text-xs uppercase tracking-[0.14em] text-ink-soft">Что получите за пару минут</p>
            <ul className="mt-3 space-y-2 font-sans text-[0.95rem] text-ink">
              <li className="flex gap-3">
                <span className="font-display font-bold text-oxblood">1</span>Главную утечку — где именно сайт теряет заявки
              </li>
              <li className="flex gap-3">
                <span className="font-display font-bold text-oxblood">2</span>Оценки по 8 направлениям — от первого экрана до нейропоиска
              </li>
              <li className="flex gap-3">
                <span className="font-display font-bold text-oxblood">3</span>План правок по приоритету — что чинить первым
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* живой пример разбора */}
      <Reveal className={`${WRAP} mt-32 sm:mt-40`}>
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
          {/* расшифровка демо — продаёт пользу, не только вид */}
          <div className="mt-6 max-w-2xl space-y-2.5 font-sans text-[0.95rem] leading-relaxed text-ink">
            <p>
              <span className="text-xs uppercase tracking-[0.12em] text-ink-soft">Что нашли — </span>
              сайт продаёт атмосферу, но не показывает цену и условия бронирования.
            </p>
            <p>
              <span className="text-xs uppercase tracking-[0.12em] text-ink-soft">Почему мешало заявкам — </span>
              гость не находит, сколько стоит и что входит, уходит сравнивать и не возвращается.
            </p>
            <p>
              <span className="text-xs uppercase tracking-[0.12em] text-ink-soft">Что чинить первым — </span>
              показать цену и ключевые условия прямо у кнопки «Забронировать».
            </p>
          </div>
          <div className="mt-10">
            <Link href="#audit" className="inline-block bg-oxblood px-7 py-4 font-display text-base font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep">
              Проверить свой сайт
            </Link>
          </div>
        </section>
      </Reveal>

      {/* что внутри разбора */}
      <Reveal className={`${WRAP} mt-32 sm:mt-40`}>
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

      {/* AEO — тёмная акцент-полоса с мокапом нейропоиска */}
      <section className="mt-32 bg-ink py-20 sm:mt-40">
        <Reveal className={WRAP}>
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-block border border-paper/30 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-paper/70">
                Новое
              </span>
              <h2 className="mt-5 font-display font-extrabold leading-[1.1] text-paper" style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}>
                Сейчас людей ищут через нейросети
              </h2>
              <p className="mt-5 max-w-[520px] font-sans text-lg leading-relaxed text-paper/75">
                ChatGPT, Алиса, Яндекс Нейро отвечают готовыми рекомендациями. Если сайт им непонятен —
                вас в этих ответах просто нет. Проверим, видят ли вас, и покажем, как туда попасть.
              </p>
              <p className="mt-5 font-sans text-sm text-paper/50">
                Это часть разбора — вместе с заявками и удобством.
              </p>
            </div>
            <div className="hidden md:block">
              <NeuroChatMockup />
            </div>
          </div>
        </Reveal>
      </section>

      {/* как это работает */}
      <Reveal className={`${WRAP} mt-32 sm:mt-40`}>
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

      {/* финальный CTA — full-bleed оксблад */}
      <section className="mt-32 bg-oxblood py-20 text-center sm:mt-40">
        <div className={WRAP}>
          <h2 className="font-display font-black text-paper" style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}>
            Проверь свой сайт
          </h2>
          <p className="mx-auto mt-4 max-w-md font-sans text-paper/80">Бесплатно. Результат за пару минут. Без регистрации.</p>
          <Link href="#audit" className="mt-8 inline-block bg-paper px-8 py-4 font-display text-base font-bold uppercase tracking-wide text-oxblood transition hover:bg-paper-2">
            Проверить сайт
          </Link>
        </div>
      </section>

      {/* футер */}
      <footer className={`${WRAP} flex flex-col gap-3 border-t border-line py-8 sm:flex-row sm:items-center sm:justify-between`}>
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

      {/* sticky-CTA на мобайле — только когда форма ушла из вида (не дублировать) */}
      <StickyCta />
      <div className="h-16 sm:hidden" />
    </main>
  );
}
