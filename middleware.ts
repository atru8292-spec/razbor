import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Сквозной идентификатор посетителя (раздел A3). Ставится ВСЕМ на публичных
// страницах, чтобы воронка дедуплилась по одному ключу через все шаги (а не по IP,
// который схлопывает разных людей с одного адреса — офис, моб. оператор, VPN).
// Это НЕ метка владельца (is_owner — отдельный cookie, раздел A4).
const RID_COOKIE = "rid";
const OWNER_COOKIE = "is_owner";
const UTM_COOKIE = "utm";
const YEAR = 60 * 60 * 24 * 365;

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: YEAR,
};

function ensureRid(req: NextRequest, res: NextResponse): void {
  if (req.cookies.get(RID_COOKIE)) return;
  res.cookies.set(RID_COOKIE, crypto.randomUUID(), cookieOpts);
}

// Источник трафика (часть G): ловим ?utm_source из ссылки и кладём в cookie на 30
// дней. Потом /api/events|audit|lead проставляют его в события/лиды — видно, какой
// канал реально приводит заявки. Чистим значение (буквы/цифры/-/_), чтобы не мусорить.
function captureUtm(req: NextRequest, res: NextResponse): void {
  const raw = req.nextUrl.searchParams.get("utm_source");
  if (!raw) return;
  const src = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  if (src) res.cookies.set(UTM_COOKIE, src, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

// Метка владельца (раздел A4). Прошёл Basic-auth в /admin = это владелец → его
// заходы помечаются и по умолчанию исключаются из воронки. Отдельный cookie от rid.
// Ставим только если cookie ещё нет: значение "off" (кнопка «считать») не перетираем.
function markOwnerIfAbsent(req: NextRequest, res: NextResponse): void {
  if (req.cookies.get(OWNER_COOKIE)) return;
  res.cookies.set(OWNER_COOKIE, "1", cookieOpts);
}

// 301-редиректы устаревших URL на актуальные (анти-каннибализация контента,
// content-plan v2). sajt-est-a-klientov-net слит в пиллар как разделы — старый
// slug ведём на пиллар, чтобы не терять ссылки и вес. Постоянный (301).
const REDIRECTS_301: Record<string, string> = {
  "/blog/sajt-est-a-klientov-net": "/blog/pochemu-sajt-ne-prinosit-zayavki",
};

// Basic-auth для /admin (раздел 14). Пара берётся из ADMIN_USER/ADMIN_PASSWORD.
// ВАЖНО: значения инлайнятся при сборке — .env должен содержать их ДО `npm run build`.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const redirectTo = REDIRECTS_301[pathname];
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, req.url), 301);
  }

  if (pathname.startsWith("/admin")) {
    const user = process.env.ADMIN_USER;
    const pass = process.env.ADMIN_PASSWORD;

    // не настроено → закрыто
    if (!user || !pass) {
      return new NextResponse("Админка не настроена.", { status: 401 });
    }

    const header = req.headers.get("authorization");
    if (header?.startsWith("Basic ")) {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === pass) {
        const res = NextResponse.next();
        ensureRid(req, res);
        markOwnerIfAbsent(req, res); // владелец опознан по Basic-auth
        return res;
      }
    }

    return new NextResponse("Требуется авторизация.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="razbor-admin"' },
    });
  }

  // Публичные страницы (лендинг, выдача) — сквозной rid + источник трафика (utm).
  const res = NextResponse.next();
  ensureRid(req, res);
  captureUtm(req, res);
  return res;
}

export const config = {
  matcher: ["/", "/a/:path*", "/admin", "/admin/:path*", "/blog/sajt-est-a-klientov-net"],
};
