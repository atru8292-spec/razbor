// Чтение и мягкая валидация env (раздел 16 ТЗ).
// На Шаге 1 ничего не обязательно — процессы должны подниматься даже без ключей.
// Жёсткую проверку конкретного ключа делаем в точке использования через requireEnv().
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_VISION_MODEL: z.string().default("gpt-5.4"),
  OPENAI_LIGHT_MODEL: z.string().default("gpt-5.4-mini"),
  PERPLEXITY_API_KEY: z.string().optional(),
  PAGESPEED_API_KEY: z.string().optional(),
  UNISENDER_GO_API_KEY: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  SCRAPER_URL: z.string().url().default("http://localhost:8080"),
  SCRAPER_KEY: z.string().optional(),
  APP_BASE_URL: z.string().url().default("https://getrazbor.ru"),
  ADMIN_USER: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  PORT: z.coerce.number().default(8080),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);

/** Достаёт обязательную переменную в точке использования, иначе понятная ошибка. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Не задана переменная окружения ${key}. Заполни .env на сервере.`);
  }
  return value as NonNullable<Env[K]>;
}
