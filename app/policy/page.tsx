import Link from "next/link";

// Политика конфиденциальности (152-ФЗ). Шаблон — перед боевым приёмом контактов вычитать.
export const metadata = {
  title: { absolute: "Политика конфиденциальности — Razbor" },
  robots: { index: false, follow: true },
};

const EMAIL = "atru8292@gmail.com";

export default function Policy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans text-espresso">
      <Link href="/" className="font-display text-sm font-bold uppercase tracking-[0.35em] text-oxblood">
        RAZBOR
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold text-espresso">Политика обработки персональных данных</h1>

      <div className="mt-6 space-y-5 leading-relaxed text-espresso/85">
        <p>
          Сервис Razbor (далее — «Сервис») обрабатывает персональные данные пользователей в соответствии
          с Федеральным законом РФ № 152-ФЗ «О персональных данных».
        </p>

        <Section title="1. Оператор">
          Оператор — самозанятый, осуществляющий деятельность через Сервис. Контакт для обращений по вопросам
          обработки персональных данных: <a href={`mailto:${EMAIL}`} className="text-oxblood underline">{EMAIL}</a>.
        </Section>

        <Section title="2. Какие данные обрабатываем">
          Мы собираем минимум данных: оставленный вами контакт (телефон, имя пользователя Telegram или e-mail),
          факт и дату вашего согласия, технические данные (IP-адрес) для защиты от злоупотреблений. Адрес сайта,
          который вы проверяете, обрабатывается для формирования аудита.
        </Section>

        <Section title="3. Цели обработки">
          Отправка результата аудита и подарка, связь по поводу услуг (редизайн, автоматизация), защита Сервиса
          от автоматических злоупотреблений. Мы не используем данные для иных целей и не продаём их.
        </Section>

        <Section title="4. Правовое основание">
          Обработка осуществляется на основании вашего согласия, которое вы даёте, отмечая соответствующую галочку
          в форме. Согласие можно отозвать в любой момент (см. п. 7).
        </Section>

        <Section title="5. Передача третьим лицам">
          Для доставки писем используется сервис Unisender Go (РФ-инфраструктура) — исключительно как транспорт.
          Иным третьим лицам данные не передаются, кроме случаев, предусмотренных законом.
        </Section>

        <Section title="6. Срок хранения">
          Данные хранятся до достижения целей обработки или до отзыва согласия. По запросу данные удаляются.
        </Section>

        <Section title="7. Ваши права">
          Вы вправе запросить доступ к своим данным, их изменение или удаление, а также отозвать согласие —
          написав на <a href={`mailto:${EMAIL}`} className="text-oxblood underline">{EMAIL}</a>. Запрос
          обрабатывается в разумный срок.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-espresso">{title}</h2>
      <p className="mt-1">{children}</p>
    </div>
  );
}
