// Severity-система прямо из палитры (docs/DESIGN.md):
// high = оксблад, medium = тёмно-синий, low = приглушённый, ok = пыльно-голубой.
export type Severity = "high" | "medium" | "low" | "ok";

export const SEVERITY: Record<Severity, { label: string; dot: string; text: string }> = {
  high: { label: "high", dot: "bg-oxblood", text: "text-oxblood" },
  medium: { label: "medium", dot: "bg-navy", text: "text-navy" },
  low: { label: "low", dot: "bg-espresso/40", text: "text-espresso/55" },
  ok: { label: "ok", dot: "bg-dusty-blue", text: "text-navy" },
};

/** Цвет шкалы оценки по баллу: низкий = оксблад (проблема) → высокий = пыльно-голубой. */
export function scoreColor(score: number): string {
  if (score < 50) return "bg-oxblood";
  if (score < 70) return "bg-navy";
  return "bg-dusty-blue";
}
