// SSRF-защита (раздел 14 ТЗ): только http/https, блок приватных и локальных адресов.
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export class ScrapeError extends Error {
  constructor(
    public code:
      | "invalid_url"
      | "ssrf_blocked"
      | "unreachable"
      | "timeout"
      | "blocked"
      | "internal",
    message: string,
  ) {
    super(message);
    this.name = "ScrapeError";
  }
}

// Публичными считаем только unicast-адреса. Всё остальное (loopback, private,
// link-local/метадата, CGNAT, reserved, unique-local IPv6 и т.д.) — блокируем.
function isPublicAddress(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return false;
  }
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) — проверяем встроенный IPv4.
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  return addr.range() === "unicast";
}

/** Валидирует и нормализует входной URL. Бросает ScrapeError при нарушении. */
export function parseAndValidateUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ScrapeError("invalid_url", "Не похоже на корректную ссылку.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("invalid_url", "Разрешены только http и https.");
  }
  if (!url.hostname) {
    throw new ScrapeError("invalid_url", "В ссылке нет домена.");
  }
  return url;
}

/**
 * Проверяет, что хост резолвится только в публичные адреса.
 * Используется и для входного URL, и для финального URL после редиректов.
 */
export async function assertHostIsPublic(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, ""); // снять скобки IPv6-литерала

  // Литеральный localhost и .local — сразу мимо.
  if (host === "localhost" || host.endsWith(".local")) {
    throw new ScrapeError("ssrf_blocked", "Локальные адреса запрещены.");
  }

  // Если это IP-литерал — проверяем напрямую, без DNS.
  if (ipaddr.isValid(host)) {
    if (!isPublicAddress(host)) {
      throw new ScrapeError("ssrf_blocked", "Приватный или локальный адрес запрещён.");
    }
    return;
  }

  // Иначе резолвим все A/AAAA и проверяем каждый.
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new ScrapeError("unreachable", "Домен не резолвится.");
  }
  if (records.length === 0) {
    throw new ScrapeError("unreachable", "Домен не резолвится.");
  }
  for (const { address } of records) {
    if (!isPublicAddress(address)) {
      throw new ScrapeError("ssrf_blocked", "Домен резолвится в приватный адрес.");
    }
  }
}
