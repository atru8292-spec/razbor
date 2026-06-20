"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Sticky-CTA на мобайле. Показываем ТОЛЬКО когда форма (#audit) ушла из вида —
// иначе на первом экране дублируется кнопка above-fold (REDESIGN: sticky покрывает,
// не дублирует). Анимируем transform (slide), без reflow.
export default function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById("audit");
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      href="#audit"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      className={`fixed inset-x-0 bottom-0 z-40 block bg-oxblood py-4 text-center font-display text-sm font-bold uppercase tracking-wide text-paper shadow-[0_-4px_20px_rgba(78,0,0,0.15)] transition-transform duration-300 sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      Проверить сайт
    </Link>
  );
}
