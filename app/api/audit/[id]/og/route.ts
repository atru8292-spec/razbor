import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getSupabase } from "@/lib/supabase";
import type { AuditResult } from "@/lib/audit-types";

export const runtime = "nodejs";

const PAPER = "#FAF5E7";
const OXBLOOD = "#4E0000";
const ESPRESSO = "#362017";

// Шрифты грузим один раз (satori нужны ttf/otf).
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

// Лёгкий конструктор узлов для satori (без JSX).
type Node = { type: string; props: Record<string, unknown> };
function el(type: string, style: Record<string, unknown>, children?: unknown): Node {
  return { type, props: { style, children } };
}

function scoreBox(label: string, value: number): Node {
  return el("div", { display: "flex", flexDirection: "column", alignItems: "flex-start" }, [
    el("div", { fontFamily: "Unbounded", fontWeight: 700, fontSize: 84, color: OXBLOOD, lineHeight: 1 }, String(value)),
    el("div", { fontFamily: "Manrope", fontSize: 20, color: ESPRESSO, opacity: 0.6, marginTop: 8, textTransform: "uppercase", letterSpacing: 2 }, label),
  ]);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let host = "сайта";
  let scores = { conversion: 0, usability: 0, aeo: 0, overall: 0 };
  let verdict = "AI-аудит: где сайт теряет заявки";
  try {
    const { data } = await getSupabase().from("audits").select("url, result, status").eq("id", id).single();
    if (data?.url) host = hostOf(data.url);
    if (data?.status === "done" && data.result) {
      const r = data.result as AuditResult;
      scores = { conversion: r.conversion_score, usability: r.usability_score, aeo: r.aeo_score, overall: r.overall_score };
      if (r.verdict) verdict = r.verdict.slice(0, 130);
    }
  } catch {
    /* дефолты */
  }

  const tree = el(
    "div",
    {
      width: 1200,
      height: 630,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: PAPER,
      padding: 64,
      borderLeft: `20px solid ${OXBLOOD}`,
      fontFamily: "Manrope",
    },
    [
      el("div", { display: "flex", flexDirection: "column" }, [
        el("div", { fontFamily: "Unbounded", fontWeight: 700, fontSize: 34, letterSpacing: 8, color: OXBLOOD }, "RAZBOR"),
        el("div", { fontFamily: "Manrope", fontSize: 30, color: ESPRESSO, marginTop: 24 }, host),
        el("div", { fontFamily: "Manrope", fontWeight: 700, fontSize: 40, color: ESPRESSO, marginTop: 12, lineHeight: 1.2 }, verdict),
      ]),
      el("div", { display: "flex", justifyContent: "space-between", width: "100%" }, [
        scoreBox("Конверсия", scores.conversion),
        scoreBox("Удобство", scores.usability),
        scoreBox("ИИ-видимость", scores.aeo),
        scoreBox("Итог", scores.overall),
      ]),
    ],
  );

  try {
    const svg = await satori(tree as unknown as React.ReactNode, { width: 1200, height: 630, fonts: getFonts() });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
    return new NextResponse(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
    });
  } catch (e) {
    console.error("[og] ошибка генерации:", e);
    return NextResponse.json({ error: "og failed" }, { status: 500 });
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
