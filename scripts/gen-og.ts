import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ogCardPng } from "../lib/og-card";

// Генерация статической дефолтной OG-карточки (главная + дефолт блога).
// Запуск: npx tsx scripts/gen-og.ts  → public/og.png (1200×630).
// Контент-карточки статей рендерятся на лету в app/blog/[slug]/og/route.ts.
async function main() {
  const png = await ogCardPng({
    eyebrow: "RAZBOR",
    title: "Видно, где сайт теряет заявки",
    footer: "getrazbor.ru · бесплатный разбор сайта",
  });
  const out = join(process.cwd(), "public/og.png");
  writeFileSync(out, png);
  console.log("og.png written:", png.length, "bytes →", out);
}

main();
