// Серверный клиент Supabase на service-ключе. ТОЛЬКО server-side (раздел 14 ТЗ).
// Ленивая инициализация: процесс поднимается без ключей (Шаг 1), клиент создаётся
// при первом использовании — тогда же проверяются переменные.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_KEY"),
      { auth: { persistSession: false } },
    );
  }
  return client;
}
