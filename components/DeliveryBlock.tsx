"use client";

// Блок подарка/отчёта на разблокированной выдаче (раздел 11/13 ТЗ).
// Ссылка на подарок видна сразу; «Забрать в Telegram» — диплинк к боту.
export interface Delivery {
  giftUrl: string;
  reportUrl: string;
  telegramDeeplink: string;
}

export default function DeliveryBlock({ delivery, pdfUrl }: { delivery: Delivery; pdfUrl?: string | null }) {
  return (
    <section className="mt-8 rounded-lg border border-oxblood/30 bg-white p-6">
      <h3 className="font-display text-xl font-semibold text-espresso">Ваш подарок и отчёт</h3>
      <p className="mt-2 font-sans text-sm text-espresso/70">
        Чек-лист «Где сайт теряет заявки» и ссылка на этот разбор — сохраните или заберите в Telegram.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={delivery.giftUrl}
          target="_blank"
          rel="noopener"
          className="rounded-md bg-oxblood px-5 py-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-paper transition hover:opacity-90"
        >
          Скачать чек-лист
        </a>
        <a
          href={delivery.telegramDeeplink}
          target="_blank"
          rel="noopener"
          className="rounded-md border border-navy px-5 py-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-navy transition hover:bg-navy hover:text-paper"
        >
          Забрать в Telegram
        </a>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener"
            className="rounded-md border border-espresso/30 px-5 py-3 text-center font-display text-sm font-semibold uppercase tracking-wide text-espresso transition hover:border-espresso"
          >
            Скачать PDF
          </a>
        )}
      </div>
    </section>
  );
}
