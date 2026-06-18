import type { Config } from "tailwindcss";

// Палитра и типографика — locked, из docs/DESIGN.md.
// Это база для Шага 7 (премиальная выдача). Компоненты тут не описываем.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oxblood: "#4E0000", // brand primary + severity HIGH
        espresso: "#362017", // основной текст
        paper: "#FAF5E7", // фон страницы
        "dusty-blue": "#A9BBD1", // спокойный акцент / severity OK
        navy: "#263650", // глубина, шапки / severity MEDIUM
      },
      fontFamily: {
        // подключаются через next/font в app/layout.tsx
        display: ["var(--font-unbounded)", "system-ui", "sans-serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
