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
    <p style="font-size:13px;line-height:1.6;color:rgba(54,32,23,0.65);margin:0;">
      Если нужно помочь с правками — ответьте на это письмо.
    </p>`;
  return { subject: "Ваш разбор сайта и подарок — RAZBOR", html: shell(inner) };
}

// Follow-up касания (раздел 12). touch 1 — «с чего бы начала», touch 2 — кейс. Свои шаблоны.
export function followupEmail(
  touch: 1 | 2,
  params: { reportUrl: string; ownerContact: string },
): { subject: string; html: string } {
  if (touch === 1) {
    const inner = `
      <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">С чего я бы начала</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Вы недавно проверили сайт. Если коротко — наибольший прирост заявок обычно даёт
        первый экран и путь к действию: понятный оффер, один CTA, убранное трение в форме.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
        В вашем разборе всё расписано по элементам и приоритетам.
      </p>
      <p style="margin:0 0 24px;">${button(params.reportUrl, "Открыть разбор")}</p>
      <p style="font-size:14px;line-height:1.6;margin:0;">
        Хотите, чтобы это починили под ключ? ${link(params.ownerContact, "Напишите мне")}.
      </p>`;
    return { subject: "С чего начать, чтобы сайт приносил больше заявок", html: shell(inner) };
  }
  const inner = `
    <h1 style="font-size:23px;margin:0 0 16px;color:${ESPRESSO};">Как это работает на практике</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Перепаковка первого экрана, доверие и упрощение пути к заявке обычно дают ощутимый
      рост конверсии уже в первые недели после редизайна.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">
      Если хотите такой результат для своего сайта — давайте обсудим, что и в каком порядке делать.
    </p>
    <p style="margin:0 0 8px;">${button(params.ownerContact, "Обсудить редизайн")}</p>
    <p style="font-size:13px;line-height:1.6;color:rgba(54,32,23,0.65);margin:16px 0 0;">
      Ваш разбор всегда здесь: ${link(params.reportUrl, "открыть")}.
    </p>`;
  return { subject: "Что даёт редизайн — и стоит ли он того", html: shell(inner) };
}

function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${OXBLOOD};font-weight:bold;">${label}</a>`;
}
