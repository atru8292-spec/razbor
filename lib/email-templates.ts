// Свои брендовые шаблоны писем (раздел 11/12, docs/DESIGN.md). Unisender Go только доставляет.
// В письмах web-safe шрифты (Unbounded не отрисуется), бренд держим цветом и вёрсткой.

const OXBLOOD = "#4E0000";
const PAPER = "#FAF5E7";
const ESPRESSO = "#362017";

function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:${PAPER};padding:32px 0;font-family:Arial,Helvetica,sans-serif;color:${ESPRESSO};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid rgba(54,32,23,0.12);border-radius:10px;overflow:hidden;">
      <tr><td style="padding:28px 32px;border-bottom:3px solid ${OXBLOOD};">
        <span style="font-size:18px;font-weight:bold;letter-spacing:3px;color:${OXBLOOD};">RAZBOR</span>
      </td></tr>
      <tr><td style="padding:32px;">${inner}</td></tr>
      <tr><td style="padding:20px 32px;background:${PAPER};font-size:12px;color:rgba(54,32,23,0.55);">
        Razbor — аудит сайтов. Вы получили это письмо, потому что запросили разбор и оставили контакт.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${OXBLOOD};color:${PAPER};text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;">${label}</a>`;
}

export function giftEmail(params: { reportUrl: string; giftUrl: string }): { subject: string; html: string } {
  const inner = `
    <h1 style="font-size:24px;margin:0 0 16px;color:${ESPRESSO};">Ваш разбор готов</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Полный разбор сайта открыт по ссылке ниже. И обещанный подарок — чек-лист
      «Где сайт теряет заявки».
    </p>
    <p style="margin:0 0 16px;">${button(params.reportUrl, "Открыть разбор")}</p>
    <p style="margin:0 0 24px;">${button(params.giftUrl, "Скачать чек-лист")}</p>
    <p style="font-size:14px;line-height:1.6;margin:0;">
      Загляните в разбор — там сразу видно главную утечку. Через пару дней напишу, с чего бы я начала чинить ваш сайт.
    </p>`;
  return { subject: "Ваш разбор сайта и подарок — RAZBOR", html: shell(inner) };
}

// Follow-up касания (REDESIGN §9). Дни 2/4/7, у каждого письма своя работа.
export function followupEmail(
  touch: 1 | 2 | 3,
  params: { reportUrl: string; ownerContact: string; topPriority?: string | null },
): { subject: string; html: string } {
  if (touch === 1) {
    const main = params.topPriority
      ? `Если коротко — главное в вашем случае это: <b>${escapeHtml(params.topPriority)}</b>. С этого я бы и начала.`
      : `Если коротко — больше всего заявок обычно вытягивает первый экран и прямой путь к заявке.`;
    const inner = `
      <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Посмотрели разбор?</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${main}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">Остальное — по приоритету прямо в разборе.</p>
      <p style="margin:0;">${button(params.reportUrl, "Открыть разбор")}</p>`;
    return { subject: "С чего бы я начала чинить ваш сайт", html: shell(inner) };
  }
  if (touch === 2) {
    const inner = `
      <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Как выглядит сайт, который не теряет заявки</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Без магии: понятный первый экран (что это, для кого, сколько стоит), один очевидный шаг к заявке
        и доверие рядом с кнопкой — отзывы, гарантии, ответы на частые вопросы.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
        Когда эти три вещи на месте, посетитель не уходит «подумать» — он оставляет заявку.
      </p>
      <p style="margin:0;">${link(params.reportUrl, "Перечитать ваш разбор")}</p>`;
    return { subject: "Что отличает сайт, который приносит заявки", html: shell(inner) };
  }
  const inner = `
    <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Пройдусь по вашему сайту лично</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Хотите, лично посмотрю ваш сайт и соберу план правок под вас? Это 20 минут и бесплатно —
      просто разберём, что починить первым.
    </p>
    <p style="margin:0 0 8px;">${button(params.ownerContact, "Написать и договориться")}</p>`;
  return { subject: "Соберу план правок под ваш сайт — 20 минут, бесплатно", html: shell(inner) };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${OXBLOOD};font-weight:bold;">${label}</a>`;
}
