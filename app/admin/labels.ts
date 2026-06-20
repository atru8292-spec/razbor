// Человеческий язык админки (часть B) — общий модуль для таблицы, карточки лида и
// селекта статуса. Только данные/чистые функции, без server/client-привязки.

export const SITE_TYPE_RU: Record<string, string> = {
  ecommerce: "Интернет-магазин",
  leadgen: "Сбор заявок",
  saas: "Сервис/SaaS",
  info: "Инфопродукт",
  local: "Местный бизнес",
};
export function siteTypeRu(t: string | null): string {
  return t ? SITE_TYPE_RU[t] ?? t : "—";
}

export const CHANNEL_RU: Record<string, string> = {
  phone: "Телефон",
  telegram: "Telegram",
  email: "Почта",
  sms: "СМС",
};
export function channelRu(c: string | null): string {
  return c ? CHANNEL_RU[c] ?? c : "—";
}

// Статус лида → подпись + класс бейджа-пилюли (откликнулся/клиент — оксблад-акцент).
export const STATUS_RU: Record<string, { label: string; cls: string }> = {
  new: { label: "Новый", cls: "border-espresso/25 text-espresso/65" },
  engaged: { label: "Откликнулся", cls: "border-oxblood/40 bg-oxblood/10 text-oxblood" },
  replied: { label: "Ответил", cls: "border-oxblood/40 bg-oxblood/10 text-oxblood" },
  client: { label: "Клиент", cls: "border-oxblood bg-oxblood text-paper" },
  declined: { label: "Отказ", cls: "border-espresso/20 text-espresso/40" },
};
export function statusRu(s: string | null): { label: string; cls: string } {
  return STATUS_RU[s ?? "new"] ?? { label: s ?? "Новый", cls: "border-espresso/25 text-espresso/65" };
}

// Порядок для ручной смены статуса (часть D). Значения = leads.status (не ломаем
// авто-engaged по боту/вебхуку — та же колонка).
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "Новый" },
  { value: "engaged", label: "Откликнулся" },
  { value: "replied", label: "Ответил" },
  { value: "client", label: "Клиент" },
  { value: "declined", label: "Отказ" },
];

// Доставка подарка/писем — словами, что реально произошло (вместо telegram:gift и пр.).
export const DELIVERY_TYPE_RU: Record<string, string> = { gift: "Подарок", report: "Отчёт", followup: "Письмо-догон" };
export const DELIVERY_CHAN_RU: Record<string, string> = { telegram: "в Telegram", sms: "по СМС", email: "на почту" };
export const DELIVERY_STATUS_RU: Record<string, string> = {
  sent: "отправлен",
  delivered: "доставлен",
  opened: "открыт",
  clicked: "перешёл по ссылке",
  bounced: "не дошёл",
  skipped: "не отправлен",
};
export function deliveryRu(channel: string, type: string, status: string): string {
  const t = DELIVERY_TYPE_RU[type] ?? type;
  const c = DELIVERY_CHAN_RU[channel] ?? channel;
  const st = DELIVERY_STATUS_RU[status] ?? status;
  return `${t} ${c} (${st})`;
}

// Относительное время («2 часа назад», «вчера»); точная дата — в title по hover.
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
export function relTime(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${plural(h, "час", "часа", "часов")} назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  if (d < 7) return `${d} ${plural(d, "день", "дня", "дней")} назад`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `${w} ${plural(w, "неделю", "недели", "недель")} назад`;
  }
  const mo = Math.floor(d / 30);
  return `${mo} ${plural(mo, "месяц", "месяца", "месяцев")} назад`;
}
