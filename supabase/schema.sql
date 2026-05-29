-- MomentumAI production-oriented Supabase schema.
-- Uses Supabase Auth (`auth.uid()`) for row ownership and row-level security.

create extension if not exists pgcrypto;

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  daily_agent_enabled boolean not null default true,
  target_job_sources text[] not null default array['Greenhouse', 'Lever', 'Workday', 'Company careers page'],
  email_digest boolean not null default true,
  subscription_tier text not null default 'Free' check (subscription_tier in ('Free', 'Pro', 'Premium', 'Recruiter')),
  analyses_used_this_month integer not null default 0,
  analysis_limit integer not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  status text not null check (status in ('Pending', 'Saved', 'Applied', 'Interview', 'Rejected', 'Offer')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists resume_intelligence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists job_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'Free' check (tier in ('Free', 'Pro', 'Premium', 'Recruiter')),
  status text not null default 'trialing',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_status_idx on jobs (user_id, status);
create index if not exists job_intelligence_events_user_job_idx on job_intelligence_events (user_id, job_id);
create index if not exists resume_intelligence_user_idx on resume_intelligence (user_id);

alter table user_settings enable row level security;
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table resume_intelligence enable row level security;
alter table job_intelligence_events enable row level security;
alter table subscriptions enable row level security;

drop policy if exists user_settings_owner_all on user_settings;
drop policy if exists profiles_owner_all on profiles;
drop policy if exists jobs_owner_all on jobs;
drop policy if exists resume_intelligence_owner_all on resume_intelligence;
drop policy if exists job_intelligence_events_owner_all on job_intelligence_events;
drop policy if exists subscriptions_owner_read on subscriptions;

create policy user_settings_owner_all on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy profiles_owner_all on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy jobs_owner_all on jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy resume_intelligence_owner_all on resume_intelligence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy job_intelligence_events_owner_all on job_intelligence_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy subscriptions_owner_read on subscriptions
  for select using (auth.uid() = user_id);
