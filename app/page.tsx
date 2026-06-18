// Временная заглушка Шага 1. Лендинг и форма — Шаг 3 (раздел 19 ТЗ).
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-unbounded), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          color: "var(--oxblood)",
          margin: 0,
        }}
      >
        RAZBOR
      </h1>
      <p style={{ color: "var(--espresso)", opacity: 0.7, margin: 0 }}>
        Видно, где сайт теряет заявки. Скоро.
      </p>
    </main>
  );
}
