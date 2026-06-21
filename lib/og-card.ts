import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// Бренд OG-карточка 1200×630 (ровно 1.91:1 — соц-стандарт, TG/VK не режут).
// Та же satori+resvg инфра, что в OG аудита; шрифты из assets/fonts.
// Дизайн в бренде: фон оксблад, текст бумага, RAZBOR крупно (Unbounded).

const PAPER = "#FAF5E7";
const PAPER_DIM = "rgba(250,245,231,0.72)";
const OXBLOOD = "#4E0000";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const FONT_DIR = join(process.cwd(), "assets/fonts");
let fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;
function getFonts() {
  if (!fonts) {
    fonts = [
      { name: "Manrope", data: readFileSync(join(FONT_DIR, "Manrope-Regular.ttf")), weight: 400, style: "normal" },
      { name: "Manrope", data: readFileSync(join(FONT_DIR, "Manrope-Bold.ttf")), weight: 700, style: "normal" },
      { name: "Unbounded", data: readFileSync(join(FONT_DIR, "Unbounded-Bold.ttf")), weight: 700, style: "normal" },
    ];
  }
  return fonts;
}

type Node = { type: string; props: Record<string, unknown> };
function el(type: string, style: Record<string, unknown>, children?: unknown): Node {
  return { type, props: { style, children } };
}

// Размер заголовка подгоняем под длину, чтобы влезал и оставался крупным.
function titleSize(title: string): number {
  const len = title.length;
  if (len <= 28) return 82;
  if (len <= 44) return 64;
  if (len <= 60) return 52;
  return 44;
}

export type OgCardOpts = { eyebrow?: string; title: string; footer?: string };

// Возвращает PNG-буфер бренд-карточки.
export async function ogCardPng({ eyebrow = "RAZBOR", title, footer = "getrazbor.ru · бесплатный разбор сайта" }: OgCardOpts): Promise<Buffer> {
  const tree = el(
    "div",
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: OXBLOOD,
      padding: 80,
      fontFamily: "Manrope",
    },
    [
      // эйбрау сверху
      el(
        "div",
        { display: "flex", fontFamily: "Unbounded", fontWeight: 700, fontSize: 34, letterSpacing: 8, color: PAPER },
        eyebrow,
      ),
      // заголовок — главный смысл
      el(
        "div",
        { display: "flex", fontFamily: "Unbounded", fontWeight: 700, fontSize: titleSize(title), color: PAPER, lineHeight: 1.12, maxWidth: 1040 },
        title,
      ),
      // подвал
      el(
        "div",
        { display: "flex", fontFamily: "Manrope", fontWeight: 400, fontSize: 28, color: PAPER_DIM, letterSpacing: 0.5 },
        footer,
      ),
    ],
  );

  const svg = await satori(tree as unknown as React.ReactNode, { width: OG_WIDTH, height: OG_HEIGHT, fonts: getFonts() });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();
  return Buffer.from(png);
}
