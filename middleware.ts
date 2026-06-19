import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Basic-auth для /admin (раздел 14). Пара берётся из ADMIN_USER/ADMIN_PASSWORD.
// ВАЖНО: значения инлайнятся при сборке — .env должен содержать их ДО `npm run build`.
export function middleware(req: NextRequest) {
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
      return NextResponse.next();
    }
  }

  return new NextResponse("Требуется авторизация.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="razbor-admin"' },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
