-- Razbor — схема БД, раздел 3 ТЗ v7. Прогнать в managed Supabase (SQL Editor или supabase CLI).
-- Доступ к таблицам — только серверным кодом с service-ключом (раздел 14).

create table audits(
  id uuid primary key default gen_random_uuid(),
  url text not null,
  goal text,                                  -- опциональная цель сайта со стартовой формы
  site_type text,                             -- авто: ecommerce|leadgen|saas|info|local
  status text not null default 'pending',     -- pending | running | done | error
  progress text,
  result jsonb,
  screenshots jsonb,                          -- ссылки или ключи на скриншоты
  pdf_url text,                               -- ссылка на сгенерированный PDF отчёта
  error_message text,
  created_at timestamptz default now()
);

create table leads(
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits(id),
  phone text, telegram text, email text,
  channel text,                               -- основной канал контакта
  consent boolean default false, consent_at timestamptz,
  status text default 'new',                  -- new | engaged | replied | client (этап воронки)
  followup_stage int default 0,               -- какое касание цепочки уже отправлено (0..3)
  ip text, source text,
  created_at timestamptz default now()
);

create table emails_log(
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  channel text,                               -- telegram | sms | email
  type text,                                  -- gift | report | followup
  status text,                                -- sent | delivered | opened | clicked | bounced (вебхуки Unisender Go)
  sent_at timestamptz default now()
);

create table events(                          -- продуктовая воронка, in-house аналитика
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits(id),
  lead_id uuid references leads(id),
  step text not null,                         -- landed|url_entered|audit_started|teaser_shown|contact_opened|contact_submitted|contact_abandoned|report_viewed|pdf_downloaded|followup_clicked
  meta jsonb,
  created_at timestamptz default now()
);

create index on events(step);
create index on events(created_at);
create index on leads(phone);
create index on leads(email);
create index on leads(created_at);
