// Мелкий editorial-лейбл-тег (docs/DESIGN.md).
export default function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block border border-espresso/25 px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-espresso/70">
      {children}
    </span>
  );
}
