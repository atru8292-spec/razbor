import UrlForm from "@/components/UrlForm";

// Лендинг (Шаг 3): оффер, поле URL, AEO-хук. Минимально по бренду — премиум на Шаге 7.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-oxblood">Razbor</p>

      <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-espresso sm:text-5xl">
        Видно, где сайт теряет заявки
      </h1>

      <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-espresso/80">
        Вставьте ссылку — за пару минут покажем по элементам вашего сайта, где и почему уходят
        клиенты. С оценками конверсии и удобства и планом, что чинить первым.
      </p>

      <div className="mt-10">
        <UrlForm />
      </div>

      <p className="mt-6 font-sans text-sm text-navy">
        Заодно проверим, видит ли ваш сайт ИИ-поиск (ChatGPT, Алиса, Нейро).
      </p>

      <p className="mt-12 font-sans text-xs text-espresso/50">
        Нажимая «Проверить сайт», вы запускаете бесплатный анализ. Контакт понадобится позже —
        чтобы открыть полный разбор и забрать подарок.
      </p>
    </main>
  );
}
