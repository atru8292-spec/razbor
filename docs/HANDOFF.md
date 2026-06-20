# Razbor — хендофф (всё важное в одном месте)

Сервис AI-аудита сайтов (лид-магнит). Self-hosted на одном VPS. Собран и в проде.
Этот файл — чтобы любая новая сессия (чат или Claude Code) сразу была в курсе.

---

## 1. СТАРТОВОЕ СООБЩЕНИЕ для новой сессии Claude Code

Скопируй целиком в новую сессию Claude Code (папка ~/site-audit):

```
Это проект Razbor — self-hosted AI-аудит сайтов (лид-магнит). Прочитай для контекста:
- CLAUDE.md — правила проекта
- docs/TZ.md — основное ТЗ (10 шагов, все готовы и в проде)
- docs/REDESIGN.md — ТЗ редизайна (brutalism+оксблад, выдача-аккордеоны, контент, AEO)
- docs/VOICE.md — тон бренда + воронка по Ханту

Статус: все 10 шагов + редизайн (этапы 1-6) + воронка закоммичены и в проде на getrazbor.ru.
Сервер: ssh root@31.77.197.158, проект в /var/www/razbor, 4 pm2-процесса (web/worker/scraper/bot).
Деплой ВСЕГДА: git checkout package-lock.json && git pull && npm install && npm run build && pm2 restart all --update-env

Прочитай доки и скажи, что видишь по статусу — сверимся, потом продолжим.
```

## 1b. СТАРТОВОЕ СООБЩЕНИЕ для нового чата (со мной)

```
Продолжаем проект Razbor (AI-аудит сайтов, в проде на getrazbor.ru). Я Арина,
вайб-кодер, делаю через Claude Code на маке (VPN). Сервер в Германии.
Весь контекст — в приложенном razbor-handoff.md. Прочитай его, дальше работаем.
```
(и приложи этот файл)

---

## 2. ДОСТУПЫ И ИНФРА

- **Сервер:** `ssh root@31.77.197.158` (Германия, xorek.cloud, Ubuntu 24.04).
  Проект: `/var/www/razbor`. Панель vm.xorek.cloud (atru8292@gmail.com).
- **Процессы pm2 (4):** razbor-web (:3000), razbor-worker, razbor-scraper (:8080),
  razbor-bot. Проверка: `pm2 list`, логи: `pm2 logs <имя> --lines 20`.
- **Репо:** github.com/atru8292-spec/razbor (приватный). Локально ~/site-audit на маке.
- **Домен:** getrazbor.ru (+ getrazbor.online редирект), reg.ru, до 18.06.2027.
  HTTPS certbot, автопродление. ⚠️ До 01.09.2026 пройти идентификацию через
  Госуслуги на reg.ru, иначе блок домена.
- **Supabase:** проект "razbor" (Frankfurt), https://fsuotbouvquvlkacugkm.supabase.co.
  Таблицы: audits, leads, emails_log, events.
- **Бот:** @RazborAuditBot. Контакт владельца: t.me/arinashrr.
- **Почта:** Unisender Go (go2.unisender.ru, ID 8251186), домен getrazbor.ru
  подтверждён, платный тариф подключён. Отправитель hello@getrazbor.ru.
- **AI:** прямой ключ OpenAI (модели gpt-5.4 / gpt-5.4-mini через Responses API).
- **PageSpeed:** ключ Google Cloud (проект razbor-499914).

---

## 3. КОМАНДЫ (шпаргалка)

### Деплой (ВСЕГДА так — порядок важен)
```bash
ssh root@31.77.197.158
screen -S deploy                  # чтобы сессия не рвалась на долгом build
cd /var/www/razbor && git checkout package-lock.json && git pull && npm install && npm run build && pm2 restart all --update-env
```
Если меняли только фронт (web): можно `pm2 restart razbor-web` вместо all.
Если меняли бота/воркер: `pm2 restart razbor-bot razbor-worker`.

### Восстановить screen после обрыва
```bash
ssh root@31.77.197.158
screen -r deploy
```

### Проверки
```bash
pm2 list                                          # все 4 online?
pm2 logs razbor-bot --lines 10                    # "[bot] up: @RazborAuditBot"
git log --oneline -1                              # какой коммит в проде
curl -sI https://getrazbor.ru/gift/checklist.pdf  # 200 + размер файла
```

### Редактировать .env на сервере (nano)
```bash
nano /var/www/razbor/.env
# сохранить: Ctrl+X → y → Enter
# ⚠️ ADMIN_USER/ADMIN_PASSWORD инлайнятся на build — после правки нужен npm run build
```

### Положить файл с мака в репо (пример — чек-лист)
```bash
cp ~/Downloads/"имя файла.pdf" ~/site-audit/public/gift/checklist.pdf
cd ~/site-audit && git add . && git commit -m "msg" && git push
```

---

## 4. ГРАБЛИ (которые уже наступили — не повторять)

1. **Деплой падает: «local changes to package-lock.json».**
   → ВСЕГДА перед git pull: `git checkout package-lock.json`. Внесено в команду деплоя.

2. **SSH-сессия рвётся на долгом `npm run build`.**
   → Работать внутри `screen -S deploy`. При обрыве `screen -r deploy`.

3. **Claude Code коммитит, но забывает push** → деплой тянет старый код.
   → Всегда говорить «коммить И пушь», проверять `git log --oneline -1` на сервере.

4. **Claude Code копит всё в один гигантский коммит.**
   → Просить коммитить по этапам. Легче откатывать и отлаживать.

5. **PDF-чек-лист: *.pdf был в .gitignore** → файл не доезжал до прода.
   → В .gitignore есть исключение `!public/gift/*.pdf`. Не трогать.

6. **PageSpeed врал «нет данных».**
   → Причина: без ключа API отдаёт 429 (quota exceeded). PAGESPEED_API_KEY должен
   быть в .env воркера. Без ключа блок скорости скрывается (не выдумывать).

7. **Скрапер слушает :8080, НЕ :8090.** SCRAPER_URL=http://localhost:8080.

8. **n8n/Responses API:** vision через OpenAI Responses API, НЕ chat/completions
   (был баг «Premature close» на VPS). Нативный fetch (undici), не node-fetch.

9. **OpenAI-ключ светился в чате дважды** — перевыпустить на platform.openai.com,
   если ещё не сделано (проверить).

10. **Unisender:** Gmail как отправитель НЕЛЬЗЯ. Только свой домен (getrazbor.ru).
    Бесплатный тариф шлёт только на свой адрес — нужен платный (подключён).

11. **Ctrl+O в nano на маке открывает Finder** — не работает. Сохранять Ctrl+X→y→Enter.

12. **Тесты Claude Code делит прод-Supabase** → его сиды могут мешать. Чистить
    тестовые данные после прогона (Claude Code это делает, проверять).

---

## 5. СТЕК / АРХИТЕКТУРА (кратко)

Лендинг → POST /api/audit (zod, Turnstile, лимит) → воркер берёт pending →
скрапер (Playwright, desktop+mobile, закрывает попапы) → тип сайта (gpt-5.4-mini)
→ PageSpeed → AEO (raw vs rendered HTML) → конкуренты (web search OpenAI) →
vision-разбор (gpt-5.4, Responses API) → выдача (сводка + аккордеоны направлений).
Flow B: бесплатный разбор → тизер → гейт-контакт → подарок (чек-лист + PDF + бот).
Доставка: бот по диплинку + почта Unisender. Follow-up: касания 0/1/2/4 (бот+почта).
/admin (Basic-auth): воронка по events + лиды. Вебхуки Unisender → статусы.

Стек: Next.js 15, Node 22, pm2, nginx, Supabase, Playwright, satori+resvg (OG/PDF).
Дизайн: оксблад #4E0000 / бумага #FAF5E7 / ink #1A1A1A, Unbounded + Manrope.

---

## 6. ДОКИ В РЕПО (память проекта)

- `CLAUDE.md` — правила проекта для Claude Code.
- `docs/TZ.md` — основное ТЗ, 10 шагов (все готовы).
- `docs/BRIEF.md` — бриф продукта.
- `docs/DESIGN.md` — дизайн-система (первая версия).
- `docs/REDESIGN.md` — ТЗ редизайна (brutalism, аккордеоны, контент, AEO).
- `docs/VOICE.md` — тон бренда + воронка по Ханту.

Если новая сессия — всё поднимается по этим файлам. Контекст в файлах, не в памяти.

---

## 7. ЧТО ОСТАЛОСЬ / БЭКЛОГ (на будущее, не срочно)

- Финальная приёмка вживую: прогнать аудит на 2-3 сайтах, пройти весь флоу
  (заявка → подарок → бот → письма), проверить /admin, PDF, OG-карточку.
- Госуслуги-идентификация доменов на reg.ru (до 01.09.2026).
- Проверить, перевыпущен ли OpenAI-ключ (светился в чате).
- Лендинг можно ещё усилить: соц-доказательство (счётчик «проверено N сайтов»),
  когда накопятся данные.
- В описании «правильного первого экрана» в воронке вернуть «сколько стоит»
  (Claude Code убрал по перестраховке — но это совет КЛИЕНТУ показывать цену,
  а не про цену услуг Арины).
- Юридически вычитать политику 152-ФЗ перед серьёзным трафиком.
- Telegram-догоны: проверить что tg_chat_id сохраняется и догоны идут.
