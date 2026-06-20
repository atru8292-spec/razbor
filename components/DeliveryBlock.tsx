"use client";

// Блок-завлечение в бота (GATE.md): подарок-чек-лист ТОЛЬКО в Telegram — это причина
// перейти. PDF самого разбора остаётся на сайте (это отчёт, не подарок-магнит).
export interface Delivery {
  telegramDeeplink: string;
}

export default function DeliveryBlock({ delivery, pdfHref }: { delivery: Delivery; pdfHref: string }) {
  return (
    <section className="mt-12 border-[1.5px] border-oxblood bg-paper-2 p-6 sm:p-8">
      <h3 className="font-display text-xl font-extrabold text-ink sm:text-2xl">Заберите подарок в Telegram</h3>
      <p className="mt-2 max-w-lg font-sans text-sm text-ink-soft">
        Чек-лист «Где сайт теряет заявки» пришлю в Telegram за 10 секунд — откройте бота и заберите.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={delivery.telegramDeeplink}
          target="_blank"
          rel="noopener"
          className="bg-oxblood px-6 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep"
        >
          Забрать чек-лист в Telegram
        </a>
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener"
          className="border-[1.5px] border-ink px-5 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper"
        >
          Скачать PDF разбора
        </a>
      </div>
    </section>
  );
}
