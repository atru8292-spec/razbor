"use client";

import { useEffect, useRef, useState } from "react";
import type { LiftScores } from "@/lib/audit-types";

// Радар 6 сил LIFT (§2.2): не обрезан, подписи по положению, цифра отдельной строкой,
// линия рисуется при появлении (§1a).
const AXES: { key: keyof LiftScores; label: string }[] = [
  { key: "value_prop", label: "Ценность" },
  { key: "relevance", label: "Релевант." },
  { key: "clarity", label: "Ясность" },
  { key: "urgency", label: "Срочность" },
  { key: "distraction", label: "Отвлеч." },
  { key: "anxiety", label: "Тревога" },
];

const W = 340;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const R = 84;

function point(i: number, radius: number): [number, number] {
  const a = (-90 + i * 60) * (Math.PI / 180);
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

export default function LiftRadar({ lift }: { lift: LiftScores }) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setDrawn(true);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = AXES.map((a, i) => point(i, (Math.max(0, Math.min(100, lift[a.key])) / 100) * R));
  const dataStr = dataPts.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[340px]" role="img" aria-label="Радар сил LIFT">
      {rings.map((r, ri) => (
        <polygon key={ri} points={AXES.map((_, i) => point(i, R * r).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />;
      })}

      {/* заливка + рисуемая линия */}
      <polygon points={dataStr} fill="rgba(78,0,0,0.10)" stroke="none" style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.4s ease 0.3s" }} />
      <polygon
        points={dataStr}
        fill="none"
        stroke="var(--oxblood)"
        strokeWidth={2}
        strokeLinejoin="round"
        style={{
          strokeDasharray: 900,
          strokeDashoffset: drawn ? 0 : 900,
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="var(--oxblood)" style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.3s ease 0.5s" }} />
      ))}

      {AXES.map((a, i) => {
        const [x, y] = point(i, R + 22);
        const anchor = x < CX - 6 ? "end" : x > CX + 6 ? "start" : "middle";
        return (
          <text key={a.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontFamily="var(--font-manrope), sans-serif" fill="var(--ink-soft)">
            <tspan fontSize="11" fontWeight="700">{a.label}</tspan>
            <tspan x={x} dy="13" fontSize="12" fontWeight="700" fill="var(--oxblood)">{lift[a.key]}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
