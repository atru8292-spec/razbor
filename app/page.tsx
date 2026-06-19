import UrlForm from "@/components/UrlForm";
import Tag from "@/components/ui/Tag";

// Лендинг (Шаг 7): editorial-премиум по docs/DESIGN.md. Без слопа.
export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-espresso/15 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="RAZBOR" className="h-7 w-auto" />
        <span className="hidden font-sans text-xs text-espresso/50 sm:block">Аудит сайтов</span>
      </header>

      <section className="pt-16 sm:pt-24">
        <Tag>AI-аудит за пару минут</Tag>
        <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[1.05] text-espresso sm:text-6xl">
          Видно, где сайт
          <br />
          теряет заявки
        </h1>
        <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-espresso/80">
          Вставьте ссылку — покажем по элементам вашего сайта, где и почему уходят клиенты.
          С оценками конверсии, удобства и планом, что чинить первым.
        </p>

        <div className="mt-10">
          <UrlForm />
        </div>
      </section>

      <section className="mt-20 grid gap-px border border-espresso/12 bg-espresso/12 sm:grid-cols-3">
        <Feature title="8 направлений" body="LIFT-методология: ценность, первый экран, доверие, трение, мобайл, скорость." />
        <Feature title="Деньги, не придирки" body="Каждая находка с цитатой элемента и оценкой потерь в % или деньгах." />
        <Feature title="ИИ-видимость (AEO)" body="Заодно проверим, видит ли ваш сайт ИИ-поиск — ChatGPT, Алиса, Нейро." />
      </section>

      <footer className="mt-20 border-t border-espresso/15 pt-6 font-sans text-xs text-espresso/45">
        Нажимая «Проверить сайт», вы запускаете бесплатный анализ. Контакт понадобится позже —
        чтобы открыть полный разбор и забрать подарок.
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-paper p-6">
      <h3 className="font-display text-base font-semibold text-oxblood">{title}</h3>
      <p className="mt-2 font-sans text-sm leading-relaxed text-espresso/75">{body}</p>
    </div>
  );
}
