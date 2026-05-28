create table if not exists profiles (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key,
  payload jsonb not null,
  status text not null check (status in ('Pending', 'Saved', 'Applied', 'Interview', 'Rejected', 'Offer')),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs (status);

create table if not exists resume_intelligence (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists job_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists job_intelligence_events_job_id_idx on job_intelligence_events (job_id);
