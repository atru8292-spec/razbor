"use client";

// Блок подарка/отчёта на разблокированной выдаче (раздел 11/13 ТЗ).
// Ссылка на подарок видна сразу; «Забрать в Telegram» — диплинк к боту.
export interface Delivery {
  giftUrl: string;
  reportUrl: string;
  telegramDeeplink: string;
}

export default function DeliveryBlock({ delivery, pdfHref }: { delivery: Delivery; pdfHref: string }) {
  const ghost =
    "border-[1.5px] border-ink px-5 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper";
  return (
    <section className="mt-12 bg-paper-2 p-6 sm:p-8">
      <h3 className="font-display text-xl font-extrabold text-ink">Ваш подарок и отчёт</h3>
      <p className="mt-2 max-w-lg font-sans text-sm text-ink-soft">
        Чек-лист «Где сайт теряет заявки» и ссылка на этот разбор — сохраните или заберите в Telegram.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={delivery.giftUrl}
          target="_blank"
          rel="noopener"
          className="bg-oxblood px-6 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-paper transition hover:bg-oxblood-deep"
        >
          Скачать чек-лист
        </a>
        <a href={delivery.telegramDeeplink} target="_blank" rel="noopener" className={ghost}>
          Забрать в Telegram
        </a>
        <a href={pdfHref} target="_blank" rel="noopener" className={ghost}>
          Скачать PDF
        </a>
      </div>
    </section>
  );
}
