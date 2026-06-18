# Razbor

Сервис AI-аудита сайтов. Self-hosted на одном VPS через pm2. Источник истины — `docs/TZ.md` (v7).

## Структура

- `app/` — Next.js (App Router). Лендинг и форма — Шаг 3.
- `worker/` — фоновый воркер аудитов (Шаг 4).
- `scraper/` — Playwright-скрапер на Express (Шаг 2).
- `bot/` — Telegram-бот выдачи подарка (Шаг 6).
- `lib/` — общий код (Supabase, env, config).
- `supabase/migrations/` — SQL-схема (раздел 3 ТЗ).
- `deploy/` — pm2 (`ecosystem.config.js`) и nginx (`nginx-razbor.conf`).

## Локально (нужен Node 22)

```bash
nvm use            # берёт версию из .nvmrc
npm install
cp .env.example .env   # заполнить ключи
npm run dev            # Next.js на :3000
```

## Деплой на сервер (git pull)

```bash
git pull
npm install
npx playwright install --with-deps chromium   # браузер для скрапера (Шаг 2), первый раз
npm run build
pm2 start deploy/ecosystem.config.js   # первый раз
pm2 restart all                        # последующие
```

### Скрапер (Шаг 2)

`POST http://127.0.0.1:8080/scrape` с заголовком `x-scraper-key: $SCRAPER_KEY` и телом
`{"url":"https://..."}`. Слушает только localhost. Возвращает desktop+mobile скриншоты
(base64 jpeg), отрисованный и сырой HTML, извлечённые данные и AEO-сигналы. SSRF-защита,
очередь по одной странице, мягкие ошибки (см. `lib/scrape-types.ts`).

## Проверка Шага 1

- `npm run build` — зелёный.
- `pm2 status` — `razbor-web`, `razbor-worker`, `razbor-scraper`, `razbor-bot` в статусе `online`, без рестарт-цикла.
- `curl localhost:3000` — заглушка RAZBOR.
- `curl localhost:8080/health` — `{"ok":true,...}`.
- Supabase: 4 таблицы (`audits`, `leads`, `emails_log`, `events`) и индексы созданы.
- Через nginx сайт открывается по `getrazbor.ru` (HTTPS — после `certbot`).
