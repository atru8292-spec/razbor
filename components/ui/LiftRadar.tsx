import type { LiftScores } from "@/lib/audit-types";

// Рукописный SVG-радар по 6 силам LIFT (без чарт-библиотек). Оксблад на бумаге.
const AXES: { key: keyof LiftScores; label: string }[] = [
  { key: "value_prop", label: "Ценность" },
  { key: "relevance", label: "Релевантность" },
  { key: "clarity", label: "Ясность" },
  { key: "urgency", label: "Срочность" },
  { key: "distraction", label: "Отвлечение" },
  { key: "anxiety", label: "Тревога" },
];

const SIZE = 260;
const C = SIZE / 2;
const R = 86;

function point(i: number, radius: number): [number, number] {
  const angle = (-90 + i * 60) * (Math.PI / 180);
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
}

export default function LiftRadar({ lift }: { lift: LiftScores }) {
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = AXES.map((a, i) => point(i, (Math.max(0, Math.min(100, lift[a.key])) / 100) * R));
  const dataPath = dataPts.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full max-w-[320px]" role="img" aria-label="Радар LIFT">
      {rings.map((r, ri) => (
        <polygon
          key={ri}
          points={AXES.map((_, i) => point(i, R * r).join(",")).join(" ")}
          fill="none"
          stroke="#36201722"
          strokeWidth={1}
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#36201722" strokeWidth={1} />;
      })}
      <polygon points={dataPath} fill="#4E000022" stroke="#4E0000" strokeWidth={2} />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="#4E0000" />
      ))}
      {AXES.map((a, i) => {
        const [x, y] = point(i, R + 18);
        return (
          <text
            key={a.key}
            x={x}
            y={y}
            textAnchor={x < C - 5 ? "end" : x > C + 5 ? "start" : "middle"}
            dominantBaseline="middle"
            fontSize="9"
            fill="#362017"
            fontFamily="var(--font-manrope), sans-serif"
          >
            {a.label} {lift[a.key]}
          </text>
        );
      })}
    </svg>
  );
}
