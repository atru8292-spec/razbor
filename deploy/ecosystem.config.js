// pm2 — 4 процесса Razbor на одном VPS (раздел 1 ТЗ).
// Запуск на сервере из корня репо: pm2 start deploy/ecosystem.config.js
// non-Next процессы гоняем через tsx (TS без отдельного build-шага).
const tsx = "./node_modules/.bin/tsx";

module.exports = {
  apps: [
    {
      name: "razbor-web",
      script: "npm",
      args: "start", // next start -p 3000
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
    },
    {
      name: "razbor-worker",
      script: tsx,
      args: "worker/index.ts",
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
    },
    {
      name: "razbor-scraper",
      script: tsx,
      args: "scraper/server.ts",
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production", PORT: "8080" },
    },
    {
      name: "razbor-bot",
      script: tsx,
      args: "bot/index.ts",
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
    },
  ],
};
