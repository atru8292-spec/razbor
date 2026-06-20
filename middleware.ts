import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Сквозной идентификатор посетителя (раздел A3). Ставится ВСЕМ на публичных
// страницах, чтобы воронка дедуплилась по одному ключу через все шаги (а не по IP,
// который схлопывает разных людей с одного адреса — офис, моб. оператор, VPN).
// Это НЕ метка владельца (is_owner — отдельный cookie, раздел A4).
const RID_COOKIE = "rid";
const YEAR = 60 * 60 * 24 * 365;

function ensureRid(req: NextRequest, res: NextResponse): void {
  if (req.cookies.get(RID_COOKIE)) return;
  res.cookies.set(RID_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
}

// Basic-auth для /admin (раздел 14). Пара берётся из ADMIN_USER/ADMIN_PASSWORD.
// ВАЖНО: значения инлайнятся при сборке — .env должен содержать их ДО `npm run build`.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
        return res;
      }
    }

    return new NextResponse("Требуется авторизация.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="razbor-admin"' },
    });
  }

  // Публичные страницы (лендинг, выдача) — просто гарантируем сквозной rid.
  const res = NextResponse.next();
  ensureRid(req, res);
  return res;
}

export const config = {
  matcher: ["/", "/a/:path*", "/admin", "/admin/:path*"],
};
