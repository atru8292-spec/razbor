import { NextResponse } from "next/server";
import { getPost } from "@/lib/blog";
import { ogCardPng } from "@/lib/og-card";

export const runtime = "nodejs";

// Контентная OG-карточка статьи: бренд-фон + заголовок статьи. Та же satori+resvg
// инфра (lib/og-card). Рендерится на лету, кэшируется — дёшево, бьёт по запросу
// краулера. Если статьи нет — отдаём дефолтную карточку, не падаем.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const post = getPost(slug);

  try {
    const png = await ogCardPng(
      post
        ? { eyebrow: "RAZBOR · БЛОГ", title: post.title, footer: "getrazbor.ru · бесплатный разбор сайта" }
        : { eyebrow: "RAZBOR", title: "Видно, где сайт теряет заявки" },
    );
    return new NextResponse(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
    });
  } catch (e) {
    console.error("[blog-og] ошибка генерации:", e);
    return NextResponse.json({ error: "og failed" }, { status: 500 });
  }
}
