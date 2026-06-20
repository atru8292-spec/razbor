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

// Касание 0 (docs/VOICE.md): «вот проблема на вашем сайте».
export function giftEmail(params: { reportUrl: string; giftUrl: string }): { subject: string; html: string } {
  const inner = `
    <h1 style="font-size:24px;margin:0 0 16px;color:${ESPRESSO};">Готово. Вот ваш разбор</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Разбор сайта открыт по ссылке. И чек-лист, как обещала.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Гляньте — там видно, где сайт теряет заявки и за что браться первым.
    </p>
    <p style="margin:0 0 16px;">${button(params.reportUrl, "Открыть разбор")}</p>
    <p style="margin:0 0 24px;">${button(params.giftUrl, "Скачать чек-лист")}</p>
    <p style="font-size:14px;line-height:1.6;margin:0;">
      Завтра вернусь и скажу, с чего бы начала на вашем месте.
    </p>`;
  return { subject: "Разбор готов — посмотрите, где утекают заявки", html: shell(inner) };
}

// Follow-up касания (docs/VOICE.md, лестница Ханта). Дни 1/2/4, у каждого своя работа.
export function followupEmail(
  touch: 1 | 2 | 3,
  params: { reportUrl: string; ownerContact: string; finding?: string | null },
): { subject: string; html: string } {
  if (touch === 1) {
    const lead = params.finding
      ? `Если коротко — узкое место у вас это <b>${escapeHtml(params.finding)}</b>.`
      : `Если коротко — больше всего заявок обычно утекает на первом экране и в пути к заявке.`;
    const inner = `
      <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Заглянули в разбор?</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${lead}</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Я бы начала прямо с него. Человек заходит, за пять секунд не понимает главного и уходит.
        И каждый раз это потерянная заявка.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
        В разборе всё разложено по порядку: от самого денежного к мелочам.
      </p>
      <p style="margin:0 0 24px;">${button(params.reportUrl, "Открыть разбор")}</p>
      <p style="font-size:13px;line-height:1.6;color:rgba(54,32,23,0.7);margin:0;">
        P.S. Завтра покажу, чем сайт, который продаёт, отличается от того, который просто красивый.
        Разница не в дизайне.
      </p>`;
    return { subject: "С чего бы я начала на вашем месте", html: shell(inner) };
  }
  if (touch === 2) {
    const weak = params.finding
      ? `<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">У вас по разбору сейчас проседает <b>${escapeHtml(params.finding)}</b>, как раз из этой логики.</p>`
      : "";
    const inner = `
      <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Красивый ≠ продающий</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Разница почти всегда не в дизайне, а в том, как сайт собран.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Первый экран, где сразу ясно: что это и для кого. Один очевидный шаг к заявке, без развилок
        «подробнее / ещё подробнее». Доверие прямо у кнопки: отзывы, гарантия, ответы на «а вдруг».
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Это не три отдельные кнопки, которые можно докрутить за вечер. Это про то, как устроена
        страница целиком. Когда логика правильная, человек не уходит думать.
      </p>
      ${weak}
      <p style="margin:0 0 24px;">${link(params.reportUrl, "Перечитать разбор")}</p>
      <p style="font-size:13px;line-height:1.6;color:rgba(54,32,23,0.7);margin:0;">
        P.S. Завтра покажу, как отличить пару правок на вечер от работы посерьёзнее.
      </p>`;
    return { subject: "Почему один сайт продаёт, а другой просто красивый", html: shell(inner) };
  }
  const inner = `
    <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Давайте разберём ваш сайт вместе</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Разбор показал, где утекают заявки. Дальше вопрос — что с этим делать.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Предлагаю так: пройдусь по вашему сайту лично, покажу, что чинить первым, и соберу короткий
      план под вас. 20 минут, бесплатно, без обязательств.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Скажу честно: иногда хватает пары правок. А иногда их набирается столько, что проще пересобрать
      страницу с нуля, чем чинить по одной. На созвоне посмотрим, что нужно именно вам — без навязывания.
    </p>
    <p style="margin:0;">${button(params.ownerContact, "Написать и договориться")}</p>`;
  return { subject: "Гляну ваш сайт лично — 20 минут, бесплатно", html: shell(inner) };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${OXBLOOD};font-weight:bold;">${label}</a>`;
}
